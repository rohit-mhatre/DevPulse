import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { LocalDatabase, Project } from './database';

const execAsync = promisify(exec);

export interface ProjectCandidate {
  path: string;
  name: string;
  type: 'git' | 'npm' | 'cargo' | 'maven' | 'gradle' | 'python' | 'generic';
  confidence: number;
  metadata?: Record<string, any>;
}

export class ProjectDetector {
  private database: LocalDatabase;
  private projectCache: Map<string, Project> = new Map();
  private readonly PROJECT_INDICATORS = [
    { file: '.git', type: 'git', weight: 0.9 },
    { file: 'package.json', type: 'npm', weight: 0.8 },
    { file: 'Cargo.toml', type: 'cargo', weight: 0.8 },
    { file: 'pom.xml', type: 'maven', weight: 0.8 },
    { file: 'build.gradle', type: 'gradle', weight: 0.8 },
    { file: 'requirements.txt', type: 'python', weight: 0.6 },
    { file: 'setup.py', type: 'python', weight: 0.7 },
    { file: 'pyproject.toml', type: 'python', weight: 0.7 },
    { file: 'Makefile', type: 'generic', weight: 0.5 },
    { file: 'CMakeLists.txt', type: 'generic', weight: 0.6 },
    { file: 'composer.json', type: 'php', weight: 0.7 },
    { file: 'go.mod', type: 'go', weight: 0.8 },
    { file: 'Gemfile', type: 'ruby', weight: 0.7 }
  ];

  constructor(database: LocalDatabase) {
    this.database = database;
    this.loadProjectCache();
  }

  private loadProjectCache(): void {
    try {
      const projects = this.database.getAllProjects();
      for (const project of projects) {
        this.projectCache.set(project.path, project);
      }
      console.log(`Loaded ${projects.length} projects into cache`);
    } catch (error) {
      console.error('Error loading project cache:', error);
    }
  }

  async detectProjectFromPath(filePath: string): Promise<Project | null> {
    try {
      let currentDir = path.dirname(filePath);
      const maxDepth = 10; // Prevent infinite loops
      let depth = 0;
      
      // Walk up directory tree looking for project indicators
      while (currentDir !== path.dirname(currentDir) && depth < maxDepth) {
        // Check cache first
        if (this.projectCache.has(currentDir)) {
          const cachedProject = this.projectCache.get(currentDir)!;
          // Update last activity time
          await this.updateProjectActivity(cachedProject.id);
          return cachedProject;
        }

        // Check for project indicators
        const candidate = await this.analyzeDirectory(currentDir);
        if (candidate && candidate.confidence > 0.5) {
          const project = await this.createOrUpdateProject(candidate);
          return project;
        }
        
        currentDir = path.dirname(currentDir);
        depth++;
      }
      
      return null;
    } catch (error) {
      console.error('Error detecting project:', error);
      return null;
    }
  }

  private async analyzeDirectory(dirPath: string): Promise<ProjectCandidate | null> {
    try {
      const files = await fs.promises.readdir(dirPath);
      let bestMatch: ProjectCandidate | null = null;
      let maxWeight = 0;

      for (const indicator of this.PROJECT_INDICATORS) {
        if (files.includes(indicator.file)) {
          if (indicator.weight > maxWeight) {
            maxWeight = indicator.weight;
            const metadata = await this.extractProjectMetadata(dirPath, indicator.type);
            
            bestMatch = {
              path: dirPath,
              name: this.extractProjectName(dirPath, indicator.type, metadata),
              type: indicator.type as any,
              confidence: indicator.weight,
              metadata
            };
          }
        }
      }

      return bestMatch;
    } catch (error) {
      // Directory might not be accessible
      return null;
    }
  }

  private async extractProjectMetadata(dirPath: string, type: string): Promise<Record<string, any>> {
    const metadata: Record<string, any> = {};

    try {
      switch (type) {
        case 'git':
          metadata.git = await this.extractGitInfo(dirPath);
          break;
        case 'npm':
          metadata.npm = await this.extractNpmInfo(dirPath);
          break;
        case 'cargo':
          metadata.cargo = await this.extractCargoInfo(dirPath);
          break;
        case 'maven':
          metadata.maven = await this.extractMavenInfo(dirPath);
          break;
        case 'python':
          metadata.python = await this.extractPythonInfo(dirPath);
          break;
      }
    } catch (error) {
      console.error(`Error extracting metadata for ${type}:`, error);
    }

    return metadata;
  }

  private async extractGitInfo(dirPath: string): Promise<Record<string, any>> {
    const gitInfo: Record<string, any> = {};

    try {
      // Get remote URL
      const gitConfigPath = path.join(dirPath, '.git', 'config');
      if (fs.existsSync(gitConfigPath)) {
        const gitConfig = await fs.promises.readFile(gitConfigPath, 'utf8');
        const remoteMatch = gitConfig.match(/url\s*=\s*(.+)/);
        if (remoteMatch) {
          gitInfo.remoteUrl = remoteMatch[1].trim();
        }

        // Extract origin URL and parse provider
        const originMatch = gitConfig.match(/\[remote "origin"\][\s\S]*?url\s*=\s*(.+)/);
        if (originMatch) {
          gitInfo.origin = originMatch[1].trim();
          gitInfo.provider = this.detectGitProvider(gitInfo.origin);
        }
      }

      // Get current branch
      try {
        const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: dirPath });
        gitInfo.currentBranch = stdout.trim();
      } catch (error) {
        gitInfo.currentBranch = 'main'; // Default
      }

      // Check if repo is clean
      try {
        const { stdout } = await execAsync('git status --porcelain', { cwd: dirPath });
        gitInfo.isClean = stdout.trim().length === 0;
        gitInfo.uncommittedChanges = stdout.trim().split('\n').length;
      } catch (error) {
        // Ignore errors
      }

    } catch (error) {
      console.error('Error extracting git info:', error);
    }

    return gitInfo;
  }

  private async extractNpmInfo(dirPath: string): Promise<Record<string, any>> {
    const npmInfo: Record<string, any> = {};

    try {
      const packageJsonPath = path.join(dirPath, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf8'));
        npmInfo.name = packageJson.name;
        npmInfo.version = packageJson.version;
        npmInfo.description = packageJson.description;
        npmInfo.main = packageJson.main;
        npmInfo.scripts = packageJson.scripts ? Object.keys(packageJson.scripts) : [];
        npmInfo.dependencies = packageJson.dependencies ? Object.keys(packageJson.dependencies).length : 0;
        npmInfo.devDependencies = packageJson.devDependencies ? Object.keys(packageJson.devDependencies).length : 0;
      }
    } catch (error) {
      console.error('Error extracting npm info:', error);
    }

    return npmInfo;
  }

  private async extractCargoInfo(dirPath: string): Promise<Record<string, any>> {
    const cargoInfo: Record<string, any> = {};

    try {
      const cargoTomlPath = path.join(dirPath, 'Cargo.toml');
      if (fs.existsSync(cargoTomlPath)) {
        const cargoToml = await fs.promises.readFile(cargoTomlPath, 'utf8');
        
        // Parse basic TOML (simple regex-based parsing)
        const nameMatch = cargoToml.match(/name\s*=\s*"([^"]+)"/);
        if (nameMatch) cargoInfo.name = nameMatch[1];

        const versionMatch = cargoToml.match(/version\s*=\s*"([^"]+)"/);
        if (versionMatch) cargoInfo.version = versionMatch[1];

        const editionMatch = cargoToml.match(/edition\s*=\s*"([^"]+)"/);
        if (editionMatch) cargoInfo.edition = editionMatch[1];

        // Check for workspace
        cargoInfo.isWorkspace = cargoToml.includes('[workspace]');
      }
    } catch (error) {
      console.error('Error extracting Cargo info:', error);
    }

    return cargoInfo;
  }

  private async extractMavenInfo(dirPath: string): Promise<Record<string, any>> {
    const mavenInfo: Record<string, any> = {};

    try {
      const pomPath = path.join(dirPath, 'pom.xml');
      if (fs.existsSync(pomPath)) {
        const pomXml = await fs.promises.readFile(pomPath, 'utf8');
        
        // Simple XML parsing with regex
        const artifactIdMatch = pomXml.match(/<artifactId>([^<]+)<\/artifactId>/);
        if (artifactIdMatch) mavenInfo.artifactId = artifactIdMatch[1];

        const groupIdMatch = pomXml.match(/<groupId>([^<]+)<\/groupId>/);
        if (groupIdMatch) mavenInfo.groupId = groupIdMatch[1];

        const versionMatch = pomXml.match(/<version>([^<]+)<\/version>/);
        if (versionMatch) mavenInfo.version = versionMatch[1];

        mavenInfo.hasParent = pomXml.includes('<parent>');
      }
    } catch (error) {
      console.error('Error extracting Maven info:', error);
    }

    return mavenInfo;
  }

  private async extractPythonInfo(dirPath: string): Promise<Record<string, any>> {
    const pythonInfo: Record<string, any> = {};

    try {
      // Check for setup.py
      const setupPyPath = path.join(dirPath, 'setup.py');
      if (fs.existsSync(setupPyPath)) {
        pythonInfo.hasSetupPy = true;
      }

      // Check for pyproject.toml
      const pyprojectPath = path.join(dirPath, 'pyproject.toml');
      if (fs.existsSync(pyprojectPath)) {
        pythonInfo.hasPyproject = true;
      }

      // Check for requirements.txt
      const requirementsPath = path.join(dirPath, 'requirements.txt');
      if (fs.existsSync(requirementsPath)) {
        const requirements = await fs.promises.readFile(requirementsPath, 'utf8');
        pythonInfo.requirementCount = requirements.split('\n').filter(line => line.trim().length > 0).length;
      }

      // Check for virtual environment indicators
      const venvPaths = ['venv', '.venv', 'env', '.env'];
      for (const venvPath of venvPaths) {
        if (fs.existsSync(path.join(dirPath, venvPath))) {
          pythonInfo.hasVenv = true;
          break;
        }
      }

    } catch (error) {
      console.error('Error extracting Python info:', error);
    }

    return pythonInfo;
  }

  private extractProjectName(dirPath: string, type: string, metadata: Record<string, any>): string {
    // Try to extract name from metadata first
    if (metadata.npm?.name) {
      return metadata.npm.name;
    }
    if (metadata.cargo?.name) {
      return metadata.cargo.name;
    }
    if (metadata.maven?.artifactId) {
      return metadata.maven.artifactId;
    }

    // Fallback to directory name
    return path.basename(dirPath);
  }

  private detectGitProvider(remoteUrl: string): string {
    if (remoteUrl.includes('github.com')) return 'github';
    if (remoteUrl.includes('gitlab.com')) return 'gitlab';
    if (remoteUrl.includes('bitbucket.org')) return 'bitbucket';
    if (remoteUrl.includes('azure.com') || remoteUrl.includes('visualstudio.com')) return 'azure';
    return 'other';
  }

  private async createOrUpdateProject(candidate: ProjectCandidate): Promise<Project> {
    const existingProject = this.database.getProjectByPath(candidate.path);
    
    if (existingProject) {
      // Update existing project
      await this.updateProjectActivity(existingProject.id);
      return existingProject;
    }

    // Create new project
    const project: Project = {
      id: this.generateId(),
      name: candidate.name,
      path: candidate.path,
      git_remote_url: candidate.metadata?.git?.remoteUrl,
      tags: JSON.stringify([candidate.type]),
      color: this.generateProjectColor(),
      created_at: new Date(),
      updated_at: new Date()
    };

    try {
      this.database.insertProject(project);
      this.projectCache.set(project.path, project);
      console.log(`Created new project: ${project.name} at ${project.path}`);
      return project;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  private async updateProjectActivity(projectId: string): Promise<void> {
    // Update project's last activity timestamp
    // This would be implemented as an update query
    console.log(`Updated activity for project: ${projectId}`);
  }

  async scanForProjects(rootPaths: string[]): Promise<Project[]> {
    const foundProjects: Project[] = [];

    for (const rootPath of rootPaths) {
      try {
        if (!fs.existsSync(rootPath)) {
          continue;
        }

        await this.recursiveScan(rootPath, foundProjects, 0, 3); // Max depth of 3
      } catch (error) {
        console.error(`Error scanning ${rootPath}:`, error);
      }
    }

    return foundProjects;
  }

  private async recursiveScan(dirPath: string, results: Project[], currentDepth: number, maxDepth: number): Promise<void> {
    if (currentDepth >= maxDepth) {
      return;
    }

    try {
      const candidate = await this.analyzeDirectory(dirPath);
      if (candidate && candidate.confidence > 0.7) {
        const project = await this.createOrUpdateProject(candidate);
        results.push(project);
        return; // Don't scan subdirectories of projects
      }

      // Scan subdirectories
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
          const subPath = path.join(dirPath, entry.name);
          await this.recursiveScan(subPath, results, currentDepth + 1, maxDepth);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  // Get common development directories based on OS
  getCommonProjectPaths(): string[] {
    const homedir = require('os').homedir();
    const commonPaths = [
      path.join(homedir, 'Projects'),
      path.join(homedir, 'Development'),
      path.join(homedir, 'Code'),
      path.join(homedir, 'Documents', 'Projects'),
      path.join(homedir, 'workspace'),
      path.join(homedir, 'src'),
    ];

    // Add OS-specific paths
    if (process.platform === 'win32') {
      commonPaths.push('C:\\Projects', 'C:\\Development');
    }

    // Filter to existing directories
    return commonPaths.filter(p => {
      try {
        return fs.existsSync(p);
      } catch {
        return false;
      }
    });
  }

  private generateId(): string {
    return `proj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateProjectColor(): string {
    const colors = [
      '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
      '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // Cleanup and refresh cache
  refreshCache(): void {
    this.projectCache.clear();
    this.loadProjectCache();
  }
}


