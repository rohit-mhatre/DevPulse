import { Tray, Menu, nativeImage, BrowserWindow, shell, NativeImage } from 'electron';
import path from 'path';
import { ActivityMonitor } from './activity-monitor';
import { LocalDatabase } from './database';
import { AppConfig } from './config';

export interface TrayStats {
  isTracking: boolean;
  currentProject?: string;
  sessionDuration: number;
  todayTotal: number;
}

export class SystemTrayController {
  private tray: Tray | null = null;
  private isTracking = false;
  private currentProject: string | null = null;
  private sessionStartTime: Date | null = null;
  private activityMonitor: ActivityMonitor;
  private database: LocalDatabase;
  private settingsWindow: BrowserWindow | null = null;

  constructor(activityMonitor: ActivityMonitor, database: LocalDatabase) {
    this.activityMonitor = activityMonitor;
    this.database = database;
  }

  createTray(): void {
    try {
      // Create a simple icon using text since we don't have image assets yet
      const icon = this.createTrayIcon();
      this.tray = new Tray(icon);
      
      this.updateContextMenu();
      this.tray.setToolTip('DevPulse - Privacy-first productivity tracking');
      
      // Handle tray click
      this.tray.on('click', () => {
        this.handleTrayClick();
      });

      // Handle right-click (context menu)
      this.tray.on('right-click', () => {
        this.tray?.popUpContextMenu();
      });

      console.log('System tray created successfully');
    } catch (error) {
      console.error('Error creating system tray:', error);
    }
  }

  private createTrayIcon(): NativeImage {
    // Create a simple 16x16 icon
    const canvas = require('canvas');
    const canvasInstance = canvas.createCanvas(16, 16);
    const ctx = canvasInstance.getContext('2d');

    // Draw a simple icon
    ctx.fillStyle = this.isTracking ? '#10B981' : '#6B7280'; // Green if tracking, gray if not
    ctx.fillRect(0, 0, 16, 16);
    
    // Add a simple pattern
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(2, 2, 12, 2);
    ctx.fillRect(2, 6, 8, 2);
    ctx.fillRect(2, 10, 10, 2);

    const buffer = canvasInstance.toBuffer('image/png');
    return nativeImage.createFromBuffer(buffer);
  }

  private updateContextMenu(): void {
    if (!this.tray) return;

    const stats = this.getCurrentStats();
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: `DevPulse ${stats.isTracking ? '(Active)' : '(Paused)'}`,
        enabled: false
      },
      { type: 'separator' },
      {
        label: stats.isTracking ? 'Pause Tracking' : 'Start Tracking',
        click: () => this.toggleTracking()
      },
      {
        label: 'Focus Mode',
        type: 'checkbox',
        checked: this.isInFocusMode(),
        click: () => this.toggleFocusMode()
      },
      { type: 'separator' },
      {
        label: stats.currentProject ? `Project: ${stats.currentProject}` : 'No active project',
        enabled: false
      },
      {
        label: `Session: ${this.formatDuration(stats.sessionDuration)}`,
        enabled: false
      },
      {
        label: `Today: ${this.formatDuration(stats.todayTotal)}`,
        enabled: false
      },
      { type: 'separator' },
      {
        label: 'Quick Stats',
        submenu: [
          {
            label: 'View Today\'s Summary',
            click: () => this.showTodaySummary()
          },
          {
            label: 'View This Week',
            click: () => this.showWeeklySummary()
          },
          {
            label: 'Export Data',
            click: () => this.exportData()
          }
        ]
      },
      { type: 'separator' },
      {
        label: 'Open Dashboard',
        click: () => this.openDashboard()
      },
      {
        label: 'Settings',
        click: () => this.openSettings()
      },
      { type: 'separator' },
      {
        label: 'About DevPulse',
        click: () => this.showAbout()
      },
      {
        label: 'Test Notification',
        click: () => this.showNotification('Test', 'This is a test notification from DevPulse!')
      },
      {
        label: 'Quit DevPulse',
        click: () => this.quitApplication()
      }
    ]);
    
    this.tray.setContextMenu(contextMenu);
  }

  private getCurrentStats(): TrayStats {
    const currentActivity = this.activityMonitor.getCurrentActivity();
    const sessionDuration = this.sessionStartTime ? 
      Math.floor((Date.now() - this.sessionStartTime.getTime()) / 1000) : 0;
    
    return {
      isTracking: this.activityMonitor.isCurrentlyMonitoring(),
      currentProject: currentActivity?.projectPath ? path.basename(currentActivity.projectPath) : undefined,
      sessionDuration,
      todayTotal: this.getTodayTotalTime()
    };
  }

  private getTodayTotalTime(): number {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      
      const activities = this.database.getActivitiesByTimeRange(startOfDay, endOfDay);
      return activities.reduce((total, activity) => total + activity.duration_seconds, 0);
    } catch (error) {
      console.error('Error calculating today\'s total time:', error);
      return 0;
    }
  }

  private handleTrayClick(): void {
    // Show quick stats in a notification or tooltip
    const stats = this.getCurrentStats();
    const message = `DevPulse - ${stats.isTracking ? 'Tracking' : 'Paused'}\n` +
                   `Session: ${this.formatDuration(stats.sessionDuration)}\n` +
                   `Today: ${this.formatDuration(stats.todayTotal)}`;
    
    this.tray?.displayBalloon({
      title: 'DevPulse Status',
      content: message
    });
  }

  private async toggleTracking(): Promise<void> {
    try {
      if (this.activityMonitor.isCurrentlyMonitoring()) {
        this.activityMonitor.stopMonitoring();
        this.isTracking = false;
        this.sessionStartTime = null;
        console.log('✅ Activity tracking STOPPED via tray');
        this.showNotification('DevPulse Paused', 'Activity tracking has been paused. Click Start Tracking to resume.');
      } else {
        await this.activityMonitor.startMonitoring();
        this.isTracking = true;
        this.sessionStartTime = new Date();
        console.log('🚀 Activity tracking STARTED via tray');
        this.showNotification('DevPulse Active', 'Activity tracking is now active. Your development activity is being recorded.');
      }
      
      this.updateTrayIcon();
      this.updateContextMenu();
    } catch (error) {
      console.error('❌ Error togling tracking:', error);
      this.showNotification('DevPulse Error', `Could not start tracking: ${error.message}`);
    }
  }

  private isInFocusMode(): boolean {
    // Check if focus mode is enabled (would be stored in settings)
    return this.database.getSetting('focusMode') === 'true';
  }

  private toggleFocusMode(): void {
    const currentState = this.isInFocusMode();
    this.database.setSetting('focusMode', (!currentState).toString());
    
    if (!currentState) {
      // Entering focus mode
      console.log('Focus mode enabled');
      this.showNotification('Focus Mode', 'Focus mode enabled. Distractions will be minimized.');
    } else {
      // Exiting focus mode
      console.log('Focus mode disabled');
      this.showNotification('Focus Mode', 'Focus mode disabled.');
    }
    
    this.updateContextMenu();
  }

  private showTodaySummary(): void {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      
      const activities = this.database.getActivitiesByTimeRange(startOfDay, endOfDay);
      const totalTime = activities.reduce((sum, a) => sum + a.duration_seconds, 0);
      
      // Group by activity type
      const byType = activities.reduce((acc, activity) => {
        acc[activity.activity_type] = (acc[activity.activity_type] || 0) + activity.duration_seconds;
        return acc;
      }, {} as Record<string, number>);

      let summary = `Today's Productivity Summary\\n\\n`;
      summary += `Total Time: ${this.formatDuration(totalTime)}\\n`;
      summary += `Activities: ${activities.length}\\n\\n`;
      
      summary += `Breakdown:\\n`;
      Object.entries(byType).forEach(([type, seconds]) => {
        const percentage = totalTime > 0 ? Math.round((seconds / totalTime) * 100) : 0;
        summary += `${type}: ${this.formatDuration(seconds)} (${percentage}%)\\n`;
      });

      this.showNotification('Today\'s Summary', summary);
    } catch (error) {
      console.error('Error generating today\'s summary:', error);
      this.showNotification('Error', 'Could not generate today\'s summary');
    }
  }

  private showWeeklySummary(): void {
    try {
      const today = new Date();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
      weekStart.setHours(0, 0, 0, 0);
      
      const activities = this.database.getActivitiesByTimeRange(weekStart, today);
      const totalTime = activities.reduce((sum, a) => sum + a.duration_seconds, 0);
      const dailyAverage = Math.floor(totalTime / 7);

      let summary = `This Week's Summary\\n\\n`;
      summary += `Total Time: ${this.formatDuration(totalTime)}\\n`;
      summary += `Daily Average: ${this.formatDuration(dailyAverage)}\\n`;
      summary += `Total Activities: ${activities.length}`;

      this.showNotification('Weekly Summary', summary);
    } catch (error) {
      console.error('Error generating weekly summary:', error);
      this.showNotification('Error', 'Could not generate weekly summary');
    }
  }

  private async exportData(): Promise<void> {
    try {
      const { dialog } = require('electron');
      const fs = require('fs').promises;
      
      const result = await dialog.showSaveDialog({
        title: 'Export DevPulse Data',
        defaultPath: `devpulse-export-${new Date().toISOString().split('T')[0]}.json`,
        filters: [
          { name: 'JSON Files', extensions: ['json'] },
          { name: 'CSV Files', extensions: ['csv'] }
        ]
      });

      if (!result.canceled && result.filePath) {
        const activities = this.database.getRecentActivities(1000);
        const projects = this.database.getAllProjects();
        
        const exportData = {
          exportDate: new Date().toISOString(),
          version: '1.0.0',
          projects,
          activities
        };

        if (result.filePath.endsWith('.csv')) {
          // Export as CSV
          const csv = this.convertToCSV(activities);
          await fs.writeFile(result.filePath, csv);
        } else {
          // Export as JSON
          await fs.writeFile(result.filePath, JSON.stringify(exportData, null, 2));
        }

        this.showNotification('Export Complete', `Data exported to ${path.basename(result.filePath)}`);
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      this.showNotification('Export Error', 'Could not export data');
    }
  }

  private convertToCSV(activities: any[]): string {
    const headers = ['Date', 'Time', 'Application', 'Activity Type', 'Duration (mins)', 'Project'];
    const rows = activities.map(activity => [
      activity.started_at.toISOString().split('T')[0],
      activity.started_at.toTimeString().split(' ')[0],
      activity.app_name,
      activity.activity_type,
      Math.round(activity.duration_seconds / 60),
      activity.project_id || 'Unknown'
    ]);

    return [headers, ...rows].map(row => row.join(',')).join('\\n');
  }

  private openDashboard(): void {
    // Get the dynamic dashboard URL
    const config = AppConfig.getInstance();
    const dashboardUrl = config.getDashboardUrl();
    
    shell.openExternal(dashboardUrl);
    console.log(`🚀 Opening DevPulse web dashboard at ${dashboardUrl}`);
  }

  private openSettings(): void {
    if (this.settingsWindow) {
      this.settingsWindow.focus();
      return;
    }

    this.settingsWindow = new BrowserWindow({
      width: 600,
      height: 500,
      title: 'DevPulse Settings',
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    // Load a simple settings page (would be implemented)
    this.settingsWindow.loadURL('data:text/html,<html><body><h1>DevPulse Settings</h1><p>Settings interface coming soon...</p></body></html>');

    this.settingsWindow.on('closed', () => {
      this.settingsWindow = null;
    });
  }

  private showAbout(): void {
    const { dialog } = require('electron');
    
    dialog.showMessageBox({
      type: 'info',
      title: 'About DevPulse',
      message: 'DevPulse',
      detail: 'Privacy-first developer productivity analytics\\n\\nVersion: 1.0.0\\nBuilt with Electron and TypeScript\\n\\nAll data is stored locally on your machine.',
      buttons: ['OK']
    });
  }

  private quitApplication(): void {
    const { app } = require('electron');
    
    // Cleanup before quitting
    this.activityMonitor.cleanup();
    this.database.cleanup();
    
    console.log('DevPulse shutting down...');
    app.quit();
  }

  private updateTrayIcon(): void {
    if (!this.tray) return;
    
    const newIcon = this.createTrayIcon();
    this.tray.setImage(newIcon);
  }

  private showNotification(title: string, body: string): void {
    // Try multiple notification methods for better compatibility
    if (this.tray) {
      // Method 1: Try tray balloon (Windows/Linux mainly)
      try {
        this.tray.displayBalloon({
          title,
          content: body
        });
      } catch (error) {
        console.log('Balloon notification failed, trying alternative...');
      }
    }

    // Method 2: Use system notification (macOS compatible)
    try {
      const { Notification } = require('electron');
      if (Notification.isSupported()) {
        const notification = new Notification({
          title,
          body,
          silent: false
        });
        notification.show();
        console.log(`📢 Notification shown: ${title} - ${body}`);
      } else {
        console.log('System notifications not supported');
      }
    } catch (error) {
      console.log(`Notification error: ${error.message}`);
    }
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  }

  // Public methods for external control
  updateStatus(isTracking: boolean, currentProject?: string): void {
    this.isTracking = isTracking;
    this.currentProject = currentProject || null;
    
    if (isTracking && !this.sessionStartTime) {
      this.sessionStartTime = new Date();
    } else if (!isTracking) {
      this.sessionStartTime = null;
    }
    
    this.updateTrayIcon();
    this.updateContextMenu();
  }

  // Refresh the tray menu periodically
  startPeriodicUpdates(): void {
    setInterval(() => {
      if (this.tray) {
        this.updateContextMenu();
      }
    }, 30000); // Update every 30 seconds
  }

  cleanup(): void {
    if (this.settingsWindow) {
      this.settingsWindow.close();
    }
    if (this.tray) {
      this.tray.destroy();
    }
  }
}