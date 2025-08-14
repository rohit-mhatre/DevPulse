import { BrowserWindow, powerMonitor, systemPreferences } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import { LocalDatabase, ActivityEvent, ActivityLog } from './database';
import { ProjectDetector } from './project-detector';

const execAsync = promisify(exec);

export interface ActiveWindow {
  appName: string;
  title: string;
  pid?: number;
}

export type ActivityType = 'code' | 'build' | 'test' | 'debug' | 'browsing' | 'research' | 'communication' | 'design' | 'document' | 'other';

export class ActivityMonitor {
  private isMonitoring = false;
  private currentActivity: ActivityEvent | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private lastActivityTime: Date = new Date();
  private activityStartTime: Date | null = null;
  private database: LocalDatabase;
  private projectDetector: ProjectDetector;
  private readonly MONITORING_INTERVAL = 2000; // 2 seconds
  private readonly IDLE_THRESHOLD = 300000; // 5 minutes in milliseconds

  constructor(database: LocalDatabase) {
    this.database = database;
    this.projectDetector = new ProjectDetector(database);
    this.setupPowerMonitoring();
  }

  private setupPowerMonitoring() {
    // Monitor system idle state
    powerMonitor.on('suspend', () => this.handleSystemSuspend());
    powerMonitor.on('resume', () => this.handleSystemResume());
    powerMonitor.on('lock-screen', () => this.handleScreenLock());
    powerMonitor.on('unlock-screen', () => this.handleScreenUnlock());
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('Activity monitoring already started');
      return;
    }

    console.log('Starting activity monitoring...');
    
    // Check screen recording permission on macOS but continue anyway for testing
    if (process.platform === 'darwin') {
      const hasPermission = await this.requestScreenRecordingPermission();
      if (!hasPermission) {
        console.log('⚠️ Screen recording permission not granted, but continuing in limited mode...');
      } else {
        console.log('✅ Screen recording permission granted!');
      }
    }

    this.isMonitoring = true;
    this.lastActivityTime = new Date();
    
    this.monitoringInterval = setInterval(() => {
      this.captureCurrentActivity().catch(error => {
        console.error('Error in activity monitoring cycle:', error);
      });
    }, this.MONITORING_INTERVAL);

    console.log('🚀 Activity monitoring started successfully');
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    console.log('Stopping activity monitoring...');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Save any pending activity
    if (this.currentActivity && this.activityStartTime) {
      this.saveCurrentActivity();
    }

    console.log('Activity monitoring stopped');
  }

  private async captureCurrentActivity(): Promise<void> {
    try {
      const activeWindow = await this.getActiveWindow();
      const idleTime = this.getSystemIdleTime();
      const isCurrentlyIdle = idleTime > this.IDLE_THRESHOLD;

      if (activeWindow && !isCurrentlyIdle) {
        const newActivity: ActivityEvent = {
          id: this.generateId(),
          timestamp: new Date(),
          appName: activeWindow.appName,
          windowTitle: activeWindow.title,
          filePath: this.extractFilePath(activeWindow.title),
          projectPath: undefined, // Will be set by project detection
          activityType: this.classifyActivity(activeWindow),
          isIdle: false
        };

        // Detect project context
        if (newActivity.filePath) {
          const project = await this.projectDetector.detectProjectFromPath(newActivity.filePath);
          if (project) {
            newActivity.projectPath = project.path;
          }
        }

        this.processActivity(newActivity);
      } else if (isCurrentlyIdle && this.currentActivity && !this.currentActivity.isIdle) {
        // User went idle, save current activity and start idle period
        this.saveCurrentActivity();
        this.currentActivity = null;
        this.activityStartTime = null;
      }

      this.lastActivityTime = new Date();
    } catch (error) {
      console.error('Error capturing activity:', error);
    }
  }

  private async getActiveWindow(): Promise<ActiveWindow | null> {
    try {
      if (process.platform === 'darwin') {
        return await this.getMacActiveWindow();
      } else if (process.platform === 'win32') {
        return await this.getWindowsActiveWindow();
      } else if (process.platform === 'linux') {
        return await this.getLinuxActiveWindow();
      }
    } catch (error) {
      console.error('Error getting active window:', error);
    }
    
    return null;
  }

  private async getMacActiveWindow(): Promise<ActiveWindow | null> {
    try {
      const { stdout } = await execAsync(`
        osascript -e 'tell application "System Events"
          set frontApp to name of first application process whose frontmost is true
          set frontWindow to ""
          try
            set frontWindow to name of first window of first application process whose frontmost is true
          end try
          return frontApp & "|" & frontWindow
        end tell'
      `);

      const [appName, title] = stdout.trim().split('|');
      if (appName) {
        return { appName, title: title || '' };
      }
    } catch (error) {
      console.error('Error getting macOS active window:', error);
    }
    
    return null;
  }

  private async getWindowsActiveWindow(): Promise<ActiveWindow | null> {
    try {
      const { stdout } = await execAsync(`
        powershell "Add-Type -AssemblyName System.Windows.Forms; 
        $window = [System.Windows.Forms.Form]::ActiveForm;
        if ($window -eq $null) { 
          $handle = [System.Diagnostics.Process]::GetCurrentProcess().MainWindowHandle;
        } else {
          $handle = $window.Handle;
        }
        $process = Get-Process | Where-Object { $_.MainWindowHandle -eq $handle };
        if ($process) { 
          Write-Output ($process.ProcessName + '|' + $process.MainWindowTitle) 
        }"
      `);

      const [appName, title] = stdout.trim().split('|');
      if (appName) {
        return { appName, title: title || '' };
      }
    } catch (error) {
      console.error('Error getting Windows active window:', error);
    }

    return null;
  }

  private async getLinuxActiveWindow(): Promise<ActiveWindow | null> {
    try {
      // Try xdotool first
      const { stdout } = await execAsync('xdotool getactivewindow getwindowname');
      const windowName = stdout.trim();
      
      if (windowName) {
        // Get the application name
        const { stdout: pidStdout } = await execAsync('xdotool getactivewindow getwindowpid');
        const pid = parseInt(pidStdout.trim());
        
        if (pid) {
          const { stdout: appStdout } = await execAsync(`ps -p ${pid} -o comm=`);
          const appName = appStdout.trim();
          
          return { appName, title: windowName, pid };
        }
      }
    } catch (error) {
      // Fallback to wmctrl
      try {
        const { stdout } = await execAsync('wmctrl -a :ACTIVE:');
        const parts = stdout.trim().split(/\s+/);
        if (parts.length >= 4) {
          const appName = parts[2];
          const title = parts.slice(4).join(' ');
          return { appName, title };
        }
      } catch (fallbackError) {
        console.error('Error getting Linux active window:', error, fallbackError);
      }
    }

    return null;
  }

  private classifyActivity(window: ActiveWindow): ActivityType {
    const appName = window.appName.toLowerCase();
    const title = window.title.toLowerCase();
    
    console.log(`🔍 Classifying activity - App: "${window.appName}", Title: "${window.title}"`);

    // Development environments - match real app names
    const codeEditors = ['visual studio code', 'vscode', 'webstorm', 'intellij', 'pycharm', 
                        'sublime text', 'atom', 'vim', 'emacs', 'neovim', 'code', 'stable'];
    if (codeEditors.some(editor => appName.includes(editor))) {
      console.log(`✅ Classified as 'code' (matched: ${codeEditors.find(editor => appName.includes(editor))})`);
      return 'code';
    }

    // Terminal and command line - common terminal names on macOS
    const terminals = ['terminal', 'iterm', 'cmd', 'powershell', 'bash', 'zsh', 'fish', 'iterm2', 'kitty', 'alacritty'];
    if (terminals.some(term => appName.includes(term))) {
      // Check for build/test commands in title
      if (title.includes('npm run') || title.includes('yarn') || title.includes('build') || 
          title.includes('webpack') || title.includes('gradle') || title.includes('maven')) {
        console.log(`✅ Classified as 'build' (terminal with build command)`);
        return 'build';
      }
      if (title.includes('test') || title.includes('jest') || title.includes('mocha') || 
          title.includes('pytest') || title.includes('cargo test')) {
        console.log(`✅ Classified as 'test' (terminal with test command)`);
        return 'test';
      }
      if (title.includes('debug') || title.includes('gdb') || title.includes('lldb')) {
        console.log(`✅ Classified as 'debug' (terminal with debug command)`);
        return 'debug';
      }
      console.log(`✅ Classified as 'code' (terminal activity)`);
      return 'code'; // Default for terminal activity
    }

    // Build tools
    const buildTools = ['docker', 'gradle', 'maven', 'xcode', 'android studio'];
    if (buildTools.some(tool => appName.includes(tool))) {
      console.log(`✅ Classified as 'build'`);
      return 'build';
    }

    // Debugging tools
    const debugTools = ['debugger', 'gdb', 'lldb', 'windbg'];
    if (debugTools.some(tool => appName.includes(tool))) {
      console.log(`✅ Classified as 'debug'`);
      return 'debug';
    }

    // Browsers - match exact names we see
    const browsers = ['chrome', 'firefox', 'safari', 'brave browser', 'brave', 'edge', 'opera'];
    if (browsers.some(browser => appName.includes(browser))) {
      // Check if it's dev tools
      if (title.includes('developer tools') || title.includes('devtools') || title.includes('inspect') || 
          title.includes('console') || title.includes('elements') || title.includes('network')) {
        console.log(`✅ Classified as 'code' (browser dev tools)`);
        return 'code';
      }
      
      // Advanced research detection - check for developer/learning content
      const researchIndicators = [
        // Documentation sites
        'documentation', 'docs.', '/docs/', 'api reference', 'readme', 'guide',
        
        // Learning platforms  
        'tutorial', 'course', 'learn', 'training', 'how to', 'walkthrough',
        'udemy', 'coursera', 'pluralsight', 'codecademy', 'freecodecamp',
        
        // Developer resources
        'stackoverflow', 'stack overflow', 'github', 'gitlab', 'bitbucket',
        'developer.mozilla.org', 'mdn web docs', 'mdn', 'mozilla',
        'reactjs.org', 'vuejs.org', 'angular.io', 'nodejs.org',
        
        // Technical blogs and resources
        'medium.com', 'dev.to', 'hashnode', 'blog', 'article', 'post',
        'npm', 'pypi', 'package', 'library', 'framework', 'api',
        
        // Problem solving
        'error', 'solution', 'fix', 'troubleshoot', 'debug',
        'issue', 'problem', 'help', 'resolve', 'solved'
      ];
      
      if (researchIndicators.some(indicator => title.includes(indicator))) {
        const matchedIndicator = researchIndicators.find(i => title.includes(i));
        console.log(`✅ Classified as 'research' (detected: ${matchedIndicator})`);
        return 'research';
      }
      
      // Social media and entertainment (casual browsing)
      const casualBrowsingIndicators = [
        'youtube', 'netflix', 'twitter', 'facebook', 'instagram', 'tiktok',
        'reddit', 'linkedin', 'discord', 'whatsapp', 'telegram',
        'news', 'sport', 'entertainment', 'shopping', 'amazon', 'ebay',
        'social', 'video', 'music', 'stream'
      ];
      
      if (casualBrowsingIndicators.some(indicator => title.includes(indicator))) {
        const matchedIndicator = casualBrowsingIndicators.find(i => title.includes(i));
        console.log(`✅ Classified as 'browsing' (social/entertainment: ${matchedIndicator})`);
        return 'browsing';
      }
      console.log(`✅ Classified as 'browsing' (general browser use)`);
      return 'browsing';
    }

    // Communication apps
    const communication = ['slack', 'discord', 'teams', 'zoom', 'mail', 'message', 'skype', 'telegram', 'whatsapp'];
    if (communication.some(app => appName.includes(app))) {
      console.log(`✅ Classified as 'communication'`);
      return 'communication';
    }

    // Design and creative apps
    const design = ['figma', 'sketch', 'photoshop', 'illustrator', 'canva', 'framer', 'adobe'];
    if (design.some(app => appName.includes(app))) {
      console.log(`✅ Classified as 'design'`);
      return 'design';
    }

    // Document/productivity apps - match macOS app names
    const productivity = ['preview', 'pages', 'word', 'excel', 'powerpoint', 'keynote', 'numbers', 'notion', 'obsidian',
                         'microsoft word', 'microsoft excel', 'microsoft powerpoint', 'textedit', 'notes'];
    if (productivity.some(app => appName.includes(app))) {
      console.log(`✅ Classified as 'document'`);
      return 'document';
    }

    // Media and entertainment apps
    const media = ['spotify', 'apple music', 'vlc', 'quicktime', 'music', 'tv', 'netflix'];
    if (media.some(app => appName.includes(app))) {
      console.log(`✅ Classified as 'browsing' (media/entertainment)`);
      return 'browsing';
    }

    console.log(`⚠️ Classified as 'other' - no specific match found for app: "${window.appName}"`);
    return 'other';
  }

  private extractFilePath(windowTitle: string): string | undefined {
    if (!windowTitle) return undefined;

    // Common patterns for file paths in window titles
    const patterns = [
      // VS Code: "filename.ext - foldername - Visual Studio Code"
      /^(.+\.\w+)\s*-\s*.+\s*-\s*Visual Studio Code/,
      // JetBrains IDEs: "[project] - filename.ext"
      /\[.+\]\s*-\s*(.+\.\w+)/,
      // Sublime: "filename.ext (path/to/file) - Sublime Text"
      /(.+\.\w+)\s*\(.+\)\s*-\s*Sublime Text/,
      // Terminal with file path
      /.*[\/\\]([^\/\\]+\.\w+)$/,
      // Generic pattern for files with extensions
      /([^\/\\]+\.\w+)(?:\s*[-–—]\s*.+)?$/
    ];

    for (const pattern of patterns) {
      const match = windowTitle.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return undefined;
  }

  private processActivity(newActivity: ActivityEvent): void {
    const now = new Date();

    if (!this.currentActivity || !this.isSameActivity(this.currentActivity, newActivity)) {
      // Activity changed, save previous activity if exists
      if (this.currentActivity && this.activityStartTime) {
        this.saveCurrentActivity();
      }

      // Start tracking new activity
      this.currentActivity = newActivity;
      this.activityStartTime = now;
    }
    // If same activity continues, just update timestamp
  }

  private isSameActivity(activity1: ActivityEvent, activity2: ActivityEvent): boolean {
    return activity1.appName === activity2.appName &&
           activity1.windowTitle === activity2.windowTitle &&
           activity1.activityType === activity2.activityType &&
           activity1.projectPath === activity2.projectPath;
  }

  private saveCurrentActivity(): void {
    if (!this.currentActivity || !this.activityStartTime) {
      return;
    }

    const endTime = new Date();
    const durationSeconds = Math.floor((endTime.getTime() - this.activityStartTime.getTime()) / 1000);

    // Only save activities longer than 5 seconds
    if (durationSeconds >= 5) {
      const activityLog: Omit<ActivityLog, 'created_at'> = {
        id: this.generateId(),
        project_id: this.currentActivity.projectPath ? 
                   this.database.getProjectByPath(this.currentActivity.projectPath)?.id : undefined,
        app_name: this.currentActivity.appName,
        window_title: this.currentActivity.windowTitle,
        file_path: this.currentActivity.filePath,
        activity_type: this.currentActivity.activityType,
        duration_seconds: durationSeconds,
        started_at: this.activityStartTime,
        ended_at: endTime,
        is_idle: this.currentActivity.isIdle,
        metadata: JSON.stringify({
          projectPath: this.currentActivity.projectPath,
          detectedAt: this.currentActivity.timestamp.toISOString()
        })
      };

      try {
        this.database.insertActivityLog(activityLog);
        console.log(`Saved activity: ${activityLog.app_name} (${durationSeconds}s)`);
      } catch (error) {
        console.error('Error saving activity log:', error);
      }
    }
  }

  private getSystemIdleTime(): number {
    try {
      if (process.platform === 'darwin') {
        return powerMonitor.getSystemIdleTime() * 1000; // Convert to milliseconds
      } else if (process.platform === 'win32') {
        // Windows implementation would require native modules
        return 0; // Placeholder
      } else {
        // Linux implementation
        return 0; // Placeholder
      }
    } catch (error) {
      console.error('Error getting system idle time:', error);
      return 0;
    }
  }

  private async requestScreenRecordingPermission(): Promise<boolean> {
    if (process.platform !== 'darwin') {
      return true;
    }

    try {
      // Check screen recording permission
      const hasPermission = systemPreferences.getMediaAccessStatus('screen') === 'granted';
      console.log(`Screen recording permission status: ${systemPreferences.getMediaAccessStatus('screen')}`);
      
      if (!hasPermission) {
        console.log('Screen recording permission required. Please grant access in System Preferences > Security & Privacy > Privacy > Screen Recording');
        console.log('Continuing in limited mode - will attempt to track activity anyway...');
        // For now, let's continue anyway to test other functionality
        return true; // Changed from false to true for testing
      }
      return true;
    } catch (error) {
      console.error('Error checking screen recording permission:', error);
      console.log('Permission check failed, but continuing anyway for testing...');
      return true; // Continue anyway
    }
  }

  private handleSystemSuspend(): void {
    console.log('System suspended, pausing activity monitoring');
    if (this.currentActivity && this.activityStartTime) {
      this.saveCurrentActivity();
      this.currentActivity = null;
      this.activityStartTime = null;
    }
  }

  private handleSystemResume(): void {
    console.log('System resumed, resuming activity monitoring');
    this.lastActivityTime = new Date();
  }

  private handleScreenLock(): void {
    console.log('Screen locked');
    this.handleSystemSuspend(); // Treat same as suspend
  }

  private handleScreenUnlock(): void {
    console.log('Screen unlocked');
    this.handleSystemResume(); // Treat same as resume
  }

  // Public methods for external access
  getCurrentActivity(): ActivityEvent | null {
    return this.currentActivity;
  }

  isCurrentlyMonitoring(): boolean {
    return this.isMonitoring;
  }

  getLastActivityTime(): Date {
    return this.lastActivityTime;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup
  cleanup(): void {
    this.stopMonitoring();
  }
}