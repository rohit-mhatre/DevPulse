import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

export interface Project {
  id: string;
  name: string;
  path: string;
  git_remote_url?: string;
  tags: string;
  color?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ActivityLog {
  id: string;
  project_id?: string;
  app_name: string;
  window_title?: string;
  file_path?: string;
  activity_type: string;
  duration_seconds: number;
  started_at: Date;
  ended_at: Date;
  is_idle: boolean;
  metadata?: string;
}

export interface ActivityEvent {
  id: string;
  timestamp: Date;
  appName: string;
  windowTitle?: string;
  filePath?: string;
  projectPath?: string;
  activityType: 'code' | 'build' | 'test' | 'debug' | 'browsing' | 'research' | 'communication' | 'design' | 'document' | 'other';
  isIdle: boolean;
}

export class LocalDatabase {
  private db: Database.Database;
  
  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'devpulse.db');
    console.log(`Database path: ${dbPath}`);
    this.db = new Database(dbPath);
    this.initializeSchema();
  }
  
  private initializeSchema() {
    try {
      // Create projects table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          path TEXT NOT NULL UNIQUE,
          git_remote_url TEXT,
          tags TEXT DEFAULT '[]',
          color TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Create activity_logs table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id TEXT PRIMARY KEY,
          project_id TEXT,
          app_name TEXT NOT NULL,
          window_title TEXT,
          file_path TEXT,
          activity_type TEXT NOT NULL CHECK(activity_type IN ('code', 'build', 'test', 'debug', 'browsing', 'research', 'communication', 'design', 'document', 'other')),
          duration_seconds INTEGER NOT NULL,
          started_at TIMESTAMP NOT NULL,
          ended_at TIMESTAMP NOT NULL,
          is_idle BOOLEAN DEFAULT FALSE,
          metadata TEXT DEFAULT '{}',
          FOREIGN KEY (project_id) REFERENCES projects(id)
        )
      `);

      // Create user_settings table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS user_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create indexes for performance
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_activity_logs_started_at ON activity_logs(started_at DESC);
        CREATE INDEX IF NOT EXISTS idx_activity_logs_project_id ON activity_logs(project_id);
        CREATE INDEX IF NOT EXISTS idx_activity_logs_app_name ON activity_logs(app_name);
        CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path);
      `);

      console.log('Database schema initialized successfully');
      
      // Run migrations
      this.runMigrations();
    } catch (error) {
      console.error('Error initializing database schema:', error);
      throw error;
    }
  }

  private runMigrations(): void {
    try {
      // Check if we need to migrate activity types
      const tableInfo = this.db.prepare("PRAGMA table_info(activity_logs)").all() as any[];
      const activityTypeColumn = tableInfo.find(col => col.name === 'activity_type');
      
      if (activityTypeColumn) {
        // Check if constraint needs updating by trying to insert a new activity type
        try {
          const testStmt = this.db.prepare("INSERT INTO activity_logs (id, app_name, activity_type, duration_seconds, started_at, ended_at) VALUES (?, ?, ?, ?, ?, ?)");
          testStmt.run('test-migration', 'test', 'browsing', 1, new Date().toISOString(), new Date().toISOString());
          
          // If successful, delete the test record
          this.db.prepare("DELETE FROM activity_logs WHERE id = ?").run('test-migration');
          console.log('Database already supports new activity types');
        } catch (error) {
          if (error.message.includes('CHECK constraint failed')) {
            console.log('Migrating database to support new activity types...');
            
            // Create new table with updated constraint
            this.db.exec(`
              CREATE TABLE activity_logs_new (
                id TEXT PRIMARY KEY,
                project_id TEXT,
                app_name TEXT NOT NULL,
                window_title TEXT,
                file_path TEXT,
                activity_type TEXT NOT NULL CHECK(activity_type IN ('code', 'build', 'test', 'debug', 'browsing', 'research', 'communication', 'design', 'document', 'other')),
                duration_seconds INTEGER NOT NULL,
                started_at TIMESTAMP NOT NULL,
                ended_at TIMESTAMP NOT NULL,
                is_idle BOOLEAN DEFAULT FALSE,
                metadata TEXT DEFAULT '{}',
                FOREIGN KEY (project_id) REFERENCES projects(id)
              )
            `);
            
            // Copy data from old table
            this.db.exec(`
              INSERT INTO activity_logs_new SELECT * FROM activity_logs
            `);
            
            // Drop old table and rename new one
            this.db.exec(`DROP TABLE activity_logs`);
            this.db.exec(`ALTER TABLE activity_logs_new RENAME TO activity_logs`);
            
            console.log('Database migration completed successfully');
          } else {
            throw error;
          }
        }
      }
    } catch (error) {
      console.error('Error running database migrations:', error);
      // Don't throw - let the app continue with what it has
    }
  }

  // Project management methods
  insertProject(project: Omit<Project, 'created_at' | 'updated_at'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO projects (id, name, path, git_remote_url, tags, color)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      project.id,
      project.name,
      project.path,
      project.git_remote_url,
      project.tags,
      project.color
    );
  }

  getProjectByPath(projectPath: string): Project | null {
    const stmt = this.db.prepare('SELECT * FROM projects WHERE path = ?');
    const result = stmt.get(projectPath) as any;
    
    if (result) {
      return {
        ...result,
        created_at: new Date(result.created_at),
        updated_at: new Date(result.updated_at)
      };
    }
    
    return null;
  }

  getAllProjects(): Project[] {
    const stmt = this.db.prepare('SELECT * FROM projects ORDER BY updated_at DESC');
    const results = stmt.all() as any[];
    
    return results.map(row => ({
      ...row,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at)
    }));
  }

  // Activity logging methods
  insertActivityLog(activity: Omit<ActivityLog, 'created_at'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO activity_logs 
      (id, project_id, app_name, window_title, file_path, activity_type, 
       duration_seconds, started_at, ended_at, is_idle, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      activity.id,
      activity.project_id,
      activity.app_name,
      activity.window_title,
      activity.file_path,
      activity.activity_type,
      activity.duration_seconds,
      activity.started_at.toISOString(),
      activity.ended_at.toISOString(),
      activity.is_idle ? 1 : 0,
      activity.metadata || '{}'
    );
  }

  getRecentActivities(limit: number = 100): ActivityLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM activity_logs 
      ORDER BY started_at DESC 
      LIMIT ?
    `);
    
    const results = stmt.all(limit) as any[];
    
    return results.map(row => ({
      ...row,
      started_at: new Date(row.started_at),
      ended_at: new Date(row.ended_at),
      is_idle: Boolean(row.is_idle)
    }));
  }

  getActivitiesByTimeRange(startTime: Date, endTime: Date): ActivityLog[] {
    const stmt = this.db.prepare(`
      SELECT * FROM activity_logs 
      WHERE started_at >= ? AND ended_at <= ?
      ORDER BY started_at DESC
    `);
    
    const results = stmt.all(startTime.toISOString(), endTime.toISOString()) as any[];
    
    return results.map(row => ({
      ...row,
      started_at: new Date(row.started_at),
      ended_at: new Date(row.ended_at),
      is_idle: Boolean(row.is_idle)
    }));
  }

  // Settings management
  setSetting(key: string, value: string): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(key, value);
  }

  getSetting(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM user_settings WHERE key = ?');
    const result = stmt.get(key) as any;
    return result?.value || null;
  }

  // Cleanup and maintenance
  cleanup(): void {
    this.db.close();
  }

  // Utility method for generating UUIDs
  generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}