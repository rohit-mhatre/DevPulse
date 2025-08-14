# DevPulse Implementation Walkthrough

## Overview
This walkthrough provides a comprehensive, step-by-step guide for implementing DevPulse - a privacy-first developer productivity analytics platform. Follow this guide to build the complete system across 8 weeks, leveraging specialized agents for optimal results.

## Prerequisites
- Node.js 20+ installed
- PostgreSQL 16+ (for cloud sync)
- Redis 7+ (for caching and queues)
- Git for version control
- VS Code or preferred IDE
- Docker and Docker Compose (for deployment)

## Project Architecture
DevPulse consists of four main components:
1. **Desktop Tracker** (Electron) - Local activity monitoring
2. **Web Dashboard** (Next.js) - Real-time analytics interface
3. **Sync Backend** (Node.js/Express) - Optional cloud synchronization
4. **AI Analytics Engine** - Advanced productivity insights

---

## Phase 1: MVP Local Tracking (Weeks 1-2)

### Week 1: Foundation Setup

#### Step 1: Initialize Project Structure
```bash
# Create project root
mkdir devpulse
cd devpulse

# Initialize monorepo
npm init -y
npm install --save-dev lerna nx

# Create workspace structure
mkdir -p apps/{desktop,dashboard,sync-backend}
mkdir -p packages/{shared,database,analytics}
mkdir -p tools/{scripts,ci}
mkdir -p docs/{api,user-guide,development}
mkdir -p tests/{e2e,performance}
```

#### Step 2: Desktop Application Setup (Agent: `mobile-app-builder`)
```bash
cd apps/desktop

# Initialize Electron app with TypeScript
npm create electron-app@latest . -- --template=typescript
npm install --save-dev @types/node

# Install additional dependencies
npm install better-sqlite3 electron-store
npm install --save-dev @types/better-sqlite3
```

**File: `apps/desktop/src/main/database.ts`**
```typescript
import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

export class LocalDatabase {
  private db: Database.Database;
  
  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'devpulse.db');
    this.db = new Database(dbPath);
    this.initializeSchema();
  }
  
  private initializeSchema() {
    // Create projects table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        git_remote_url TEXT,
        tags TEXT,
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
        activity_type TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL,
        started_at TIMESTAMP NOT NULL,
        ended_at TIMESTAMP NOT NULL,
        is_idle BOOLEAN DEFAULT FALSE,
        metadata TEXT,
        FOREIGN KEY (project_id) REFERENCES projects(id)
      )
    `);
  }
}
```

#### Step 3: Activity Monitor Implementation
**File: `apps/desktop/src/main/activity-monitor.ts`**
```typescript
import { BrowserWindow, powerMonitor } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ActivityMonitor {
  private isMonitoring = false;
  private currentActivity: ActivityEvent | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  
  async startMonitoring() {
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.captureCurrentActivity();
    }, 2000); // Check every 2 seconds
    
    // Monitor system idle state
    powerMonitor.on('suspend', () => this.handleSystemSuspend());
    powerMonitor.on('resume', () => this.handleSystemResume());
  }
  
  private async captureCurrentActivity() {
    try {
      const activeWindow = await this.getActiveWindow();
      if (activeWindow) {
        const activity: ActivityEvent = {
          id: this.generateId(),
          timestamp: new Date(),
          appName: activeWindow.appName,
          windowTitle: activeWindow.title,
          filePath: this.extractFilePath(activeWindow.title),
          activityType: this.classifyActivity(activeWindow),
          isIdle: this.getIdleTime() > 300000 // 5 minutes
        };
        
        this.processActivity(activity);
      }
    } catch (error) {
      console.error('Error capturing activity:', error);
    }
  }
  
  private async getActiveWindow(): Promise<ActiveWindow | null> {
    try {
      if (process.platform === 'darwin') {
        const { stdout } = await execAsync(`
          osascript -e 'tell application "System Events"
            set frontApp to name of first application process whose frontmost is true
            set frontWindow to name of first window of first application process whose frontmost is true
            return frontApp & "|" & frontWindow
          end tell'
        `);
        const [appName, title] = stdout.trim().split('|');
        return { appName, title };
      } else if (process.platform === 'win32') {
        // Windows implementation
        // Use PowerShell or Windows APIs
      } else {
        // Linux implementation
        // Use xdotool or similar
      }
    } catch (error) {
      console.error('Error getting active window:', error);
      return null;
    }
  }
}
```

#### Step 4: Project Detection Engine
**File: `apps/desktop/src/main/project-detector.ts`**
```typescript
import * as fs from 'fs';
import * as path from 'path';

export class ProjectDetector {
  async detectProjectFromPath(filePath: string): Promise<Project | null> {
    try {
      let currentDir = path.dirname(filePath);
      
      // Walk up directory tree looking for project indicators
      while (currentDir !== path.dirname(currentDir)) {
        // Check for Git repository
        if (fs.existsSync(path.join(currentDir, '.git'))) {
          return this.createProjectFromGitRepo(currentDir);
        }
        
        // Check for common project files
        const projectFiles = ['package.json', 'Cargo.toml', 'pom.xml', 'requirements.txt'];
        for (const file of projectFiles) {
          if (fs.existsSync(path.join(currentDir, file))) {
            return this.createProjectFromFile(currentDir, file);
          }
        }
        
        currentDir = path.dirname(currentDir);
      }
      
      return null;
    } catch (error) {
      console.error('Error detecting project:', error);
      return null;
    }
  }
  
  private async createProjectFromGitRepo(repoPath: string): Promise<Project> {
    const gitConfigPath = path.join(repoPath, '.git', 'config');
    let remoteUrl: string | undefined;
    
    try {
      const gitConfig = fs.readFileSync(gitConfigPath, 'utf8');
      const remoteMatch = gitConfig.match(/url = (.+)/);
      remoteUrl = remoteMatch ? remoteMatch[1] : undefined;
    } catch (error) {
      // Git config not readable
    }
    
    return {
      id: this.generateId(),
      name: path.basename(repoPath),
      path: repoPath,
      gitRemoteUrl: remoteUrl,
      lastActivity: new Date(),
      tags: [],
      color: this.generateRandomColor()
    };
  }
}
```

### Week 2: Core Features & Testing

#### Step 5: System Tray Interface
**File: `apps/desktop/src/main/tray.ts`**
```typescript
import { Tray, Menu, nativeImage } from 'electron';
import path from 'path';

export class SystemTrayController {
  private tray: Tray | null = null;
  private isTracking = false;
  
  createTray() {
    const iconPath = path.join(__dirname, '../assets/tray-icon.png');
    this.tray = new Tray(nativeImage.createFromPath(iconPath));
    
    this.updateContextMenu();
    this.tray.setToolTip('DevPulse - Privacy-first productivity tracking');
    
    this.tray.on('click', () => {
      // Show quick stats or toggle tracking
      this.handleTrayClick();
    });
  }
  
  private updateContextMenu() {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: this.isTracking ? 'Pause Tracking' : 'Start Tracking',
        click: () => this.toggleTracking()
      },
      { type: 'separator' },
      {
        label: 'Current Project: None',
        enabled: false
      },
      {
        label: 'Focus Mode',
        type: 'checkbox',
        click: () => this.toggleFocusMode()
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
        label: 'Quit DevPulse',
        click: () => this.quitApplication()
      }
    ]);
    
    this.tray?.setContextMenu(contextMenu);
  }
}
```

#### Step 6: Testing Setup (Agent: `test-writer-fixer`)
```bash
# Install testing dependencies
npm install --save-dev jest @types/jest spectron

# Create test structure
mkdir -p tests/{unit,integration,e2e}
```

**File: `apps/desktop/tests/unit/activity-monitor.test.ts`**
```typescript
import { ActivityMonitor } from '../../src/main/activity-monitor';

describe('ActivityMonitor', () => {
  let monitor: ActivityMonitor;
  
  beforeEach(() => {
    monitor = new ActivityMonitor();
  });
  
  test('should classify VS Code activity as coding', () => {
    const activity = monitor.classifyActivity({
      appName: 'Visual Studio Code',
      title: 'main.ts - devpulse'
    });
    
    expect(activity).toBe('coding');
  });
  
  test('should detect idle state correctly', () => {
    const idleTime = 600000; // 10 minutes
    const isIdle = monitor.isIdle(idleTime);
    
    expect(isIdle).toBe(true);
  });
});
```

---

## Phase 2: Real-Time Dashboard (Weeks 3-4)

### Week 3: Dashboard Foundation

#### Step 7: Next.js Dashboard Setup (Agent: `frontend-developer`)
```bash
cd apps/dashboard

# Create Next.js app with TypeScript
npx create-next-app@latest . --typescript --tailwind --app --src-dir

# Install additional dependencies
npm install @radix-ui/react-* lucide-react recharts zustand
npm install @tanstack/react-query socket.io-client
npm install better-sqlite3 # For local database access
```

**File: `apps/dashboard/src/app/layout.tsx`**
```tsx
import './globals.css'
import { Inter } from 'next/font/google'
import { Sidebar } from '@/components/layout/sidebar'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50`}>
        <Providers>
          <div className="flex h-full">
            <Sidebar />
            <main className="flex-1 overflow-auto">
              {children}
            </main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
```

#### Step 8: Real-Time Activity Monitor Component
**File: `apps/dashboard/src/components/activity/live-monitor.tsx`**
```tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Pause, Square } from 'lucide-react';

interface LiveActivityMonitorProps {
  currentActivity: ActivityEvent | null;
  isTracking: boolean;
  sessionDuration: number;
  currentProject: Project | null;
}

export function LiveActivityMonitor({ 
  currentActivity, 
  isTracking, 
  sessionDuration, 
  currentProject 
}: LiveActivityMonitorProps) {
  const [displayTime, setDisplayTime] = useState(sessionDuration);
  
  useEffect(() => {
    if (isTracking) {
      const interval = setInterval(() => {
        setDisplayTime(prev => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isTracking]);
  
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Current Activity</CardTitle>
        <Badge variant={isTracking ? 'default' : 'secondary'}>
          {isTracking ? 'Tracking' : 'Paused'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-3xl font-mono">
            {formatTime(displayTime)}
          </div>
          <div className="flex space-x-2">
            <Button 
              variant={isTracking ? 'secondary' : 'default'}
              size="sm"
              onClick={() => toggleTracking()}
            >
              {isTracking ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={() => stopSession()}>
              <Square className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {currentActivity && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {currentActivity.activityType}
              </Badge>
              <span className="text-sm text-gray-600">
                {currentActivity.appName}
              </span>
            </div>
            
            {currentProject && (
              <div className="text-sm text-gray-500">
                Project: {currentProject.name}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

#### Step 9: Data Visualization Components
**File: `apps/dashboard/src/components/charts/time-allocation.tsx`**
```tsx
'use client';

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TimeAllocationData {
  name: string;
  value: number;
  color: string;
}

interface TimeAllocationChartProps {
  data: TimeAllocationData[];
  title?: string;
}

export function TimeAllocationChart({ data, title = "Time Allocation" }: TimeAllocationChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const percentage = ((data.value / total) * 100).toFixed(1);
      const hours = Math.floor(data.value / 3600);
      const minutes = Math.floor((data.value % 3600) / 60);
      
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-gray-600">
            {hours}h {minutes}m ({percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={120}
              paddingAngle={2}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
```

### Week 4: Advanced Dashboard Features

#### Step 10: Focus Session Manager (Agent: `ui-designer`)
**File: `apps/dashboard/src/components/focus/session-manager.tsx`**
```tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Clock, Play } from 'lucide-react';

export function FocusSessionManager() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sessionType, setSessionType] = useState('deep_work');
  const [duration, setDuration] = useState(25);
  const [selectedProject, setSelectedProject] = useState('');
  
  const sessionTypes = [
    { value: 'deep_work', label: 'Deep Work', duration: 90 },
    { value: 'pomodoro', label: 'Pomodoro', duration: 25 },
    { value: 'timeboxing', label: 'Timeboxing', duration: 60 },
    { value: 'flow', label: 'Flow State', duration: 120 }
  ];
  
  const handleStartSession = () => {
    // Start focus session logic
    console.log('Starting focus session:', {
      type: sessionType,
      duration,
      projectId: selectedProject
    });
    setIsDialogOpen(false);
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Focus Sessions</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Target className="w-4 h-4 mr-2" />
              Start Focus Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start New Focus Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Session Type
                </label>
                <Select value={sessionType} onValueChange={setSessionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label} ({type.duration}min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Duration (minutes)
                </label>
                <Input 
                  type="number" 
                  value={duration} 
                  onChange={(e) => setDuration(Number(e.target.value))}
                  min={5}
                  max={180}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Project (optional)
                </label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="project1">DevPulse</SelectItem>
                    <SelectItem value="project2">Other Project</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={handleStartSession} className="w-full">
                <Play className="w-4 h-4 mr-2" />
                Start Session
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
```

---

## Phase 3: Core Integrations (Weeks 5-6)

### Week 5: Cloud Sync Backend

#### Step 11: Backend API Setup (Agent: `backend-architect`)
```bash
cd apps/sync-backend

# Initialize Node.js backend
npm init -y
npm install express typescript @types/express @types/node
npm install prisma @prisma/client bcryptjs jsonwebtoken
npm install cors helmet express-rate-limit winston
npm install --save-dev ts-node nodemon @types/bcryptjs @types/jsonwebtoken
```

**File: `apps/sync-backend/src/server.ts`**
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth';
import { syncRouter } from './routes/sync';
import { integrationsRouter } from './routes/integrations';
import { errorHandler } from './middleware/error-handler';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/sync', syncRouter);
app.use('/api/integrations', integrationsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0'
  });
});

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});
```

#### Step 12: Prisma Database Schema
**File: `apps/sync-backend/prisma/schema.prisma`**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  passwordHash String?
  avatarUrl String?
  timezone  String   @default("UTC")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  dataSyncs       UserDataSync[]
  integrations    IntegrationToken[]
  externalCache   ExternalDataCache[]
  syncConflicts   SyncConflict[]
  
  @@map("users")
}

model UserDataSync {
  id            String   @id @default(uuid())
  userId        String
  dataType      String   // 'projects', 'activities', 'focus_sessions'
  encryptedData Bytes
  checksum      String
  version       Int      @default(1)
  deviceId      String
  syncedAt      DateTime @default(now())
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, dataType, deviceId])
  @@map("user_data_sync")
}

model IntegrationToken {
  id                    String    @id @default(uuid())
  userId                String
  provider              String    // 'github', 'gitlab', 'slack', 'discord', 'google'
  encryptedAccessToken  Bytes
  encryptedRefreshToken Bytes?
  tokenExpiresAt        DateTime?
  scopes                String[]
  providerUserId        String?
  providerUsername      String?
  isActive              Boolean   @default(true)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, provider])
  @@map("integration_tokens")
}
```

#### Step 13: GitHub Integration Service
**File: `apps/sync-backend/src/services/github-integration.ts`**
```typescript
import { Octokit } from '@octokit/rest';
import { IntegrationToken } from '@prisma/client';
import { decrypt } from '../utils/encryption';

export class GitHubIntegrationService {
  private octokit: Octokit;
  
  constructor(private integrationToken: IntegrationToken) {
    const accessToken = decrypt(integrationToken.encryptedAccessToken);
    this.octokit = new Octokit({ auth: accessToken });
  }
  
  async getUserRepositories() {
    try {
      const { data } = await this.octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100
      });
      
      return data.map(repo => ({
        id: repo.id.toString(),
        name: repo.name,
        fullName: repo.full_name,
        private: repo.private,
        url: repo.html_url,
        language: repo.language,
        updatedAt: new Date(repo.updated_at)
      }));
    } catch (error) {
      console.error('Error fetching repositories:', error);
      throw error;
    }
  }
  
  async getCommitHistory(owner: string, repo: string, since: Date) {
    try {
      const { data } = await this.octokit.rest.repos.listCommits({
        owner,
        repo,
        since: since.toISOString(),
        per_page: 100
      });
      
      return data.map(commit => ({
        sha: commit.sha,
        message: commit.commit.message,
        author: commit.commit.author?.name || 'Unknown',
        date: new Date(commit.commit.author?.date || new Date()),
        url: commit.html_url
      }));
    } catch (error) {
      console.error('Error fetching commits:', error);
      throw error;
    }
  }
  
  async correlateCommitsWithActivity(
    userId: string, 
    timeRange: { start: Date; end: Date }
  ) {
    // Implementation for correlating commits with local activity data
    // This would analyze timing patterns and project paths
    const correlations = await this.analyzeCommitActivityCorrelation(
      userId, 
      timeRange
    );
    
    return correlations;
  }
}
```

### Week 6: External Integrations

#### Step 14: Slack Integration Service
**File: `apps/sync-backend/src/services/slack-integration.ts`**
```typescript
import { WebClient } from '@slack/web-api';
import { IntegrationToken } from '@prisma/client';
import { decrypt } from '../utils/encryption';

export class SlackIntegrationService {
  private slack: WebClient;
  
  constructor(private integrationToken: IntegrationToken) {
    const accessToken = decrypt(integrationToken.encryptedAccessToken);
    this.slack = new WebClient(accessToken);
  }
  
  async updateStatus(status: {
    emoji: string;
    text: string;
    expiration?: Date;
  }) {
    try {
      await this.slack.users.profile.set({
        profile: {
          status_text: status.text,
          status_emoji: status.emoji,
          status_expiration: status.expiration ? 
            Math.floor(status.expiration.getTime() / 1000) : 0
        }
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error updating Slack status:', error);
      throw error;
    }
  }
  
  async setPresence(presence: 'auto' | 'away') {
    try {
      await this.slack.users.setPresence({ presence });
      return { success: true };
    } catch (error) {
      console.error('Error setting Slack presence:', error);
      throw error;
    }
  }
}
```

#### Step 15: Google Calendar Integration
**File: `apps/sync-backend/src/services/calendar-integration.ts`**
```typescript
import { google } from 'googleapis';
import { IntegrationToken } from '@prisma/client';
import { decrypt } from '../utils/encryption';

export class CalendarIntegrationService {
  private calendar: any;
  
  constructor(private integrationToken: IntegrationToken) {
    const accessToken = decrypt(integrationToken.encryptedAccessToken);
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    
    this.calendar = google.calendar({ version: 'v3', auth });
  }
  
  async createFocusBlock(focusSession: {
    title: string;
    startTime: Date;
    duration: number; // minutes
    description?: string;
  }) {
    try {
      const endTime = new Date(
        focusSession.startTime.getTime() + focusSession.duration * 60000
      );
      
      const event = {
        summary: focusSession.title,
        description: focusSession.description || 'DevPulse Focus Session',
        start: {
          dateTime: focusSession.startTime.toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'UTC',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 5 },
          ],
        },
      };
      
      const { data } = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });
      
      return data;
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }
}
```

---

## Phase 4: Advanced Analytics & AI Insights (Weeks 7-8)

### Week 7: AI Analytics Engine

#### Step 16: Deep Work Score Calculator (Agent: `ai-engineer`)
**File: `packages/analytics/src/deep-work-scorer.ts`**
```typescript
export class DeepWorkScorer {
  calculateScore(activities: ActivityEvent[]): DeepWorkScore {
    const session = this.preprocessActivities(activities);
    
    // Component calculations
    const focusTime = this.calculateFocusTime(session);
    const contextStability = this.calculateContextStability(session);
    const flowState = this.detectFlowState(session);
    const outputCorrelation = this.calculateOutputCorrelation(session);
    const distractionResistance = this.calculateDistractionResistance(session);
    
    // Dynamic weighting based on session characteristics
    const weights = this.calculateDynamicWeights(session);
    
    const overall = (
      weights.focus * focusTime +
      weights.stability * contextStability +
      weights.flow * flowState +
      weights.output * outputCorrelation +
      weights.resistance * distractionResistance
    ) * 100;
    
    return {
      overall: Math.round(overall),
      components: {
        focusTime: Math.round(focusTime * 100),
        contextStability: Math.round(contextStability * 100),
        flowState: Math.round(flowState * 100),
        outputCorrelation: Math.round(outputCorrelation * 100),
        distractionResistance: Math.round(distractionResistance * 100)
      },
      confidence: this.calculateConfidence(session),
      factors: this.extractFactors(session)
    };
  }
  
  private calculateFocusTime(session: ProcessedSession): number {
    const totalTime = session.duration;
    const focusedTime = session.activities
      .filter(a => !a.isIdle && this.isFocusedActivity(a))
      .reduce((sum, a) => sum + a.duration, 0);
    
    return totalTime > 0 ? focusedTime / totalTime : 0;
  }
  
  private detectFlowState(session: ProcessedSession): number {
    // Analyze activity patterns for flow indicators
    const consistencyScore = this.calculateActivityConsistency(session);
    const rhythmScore = this.calculateActivityRhythm(session);
    const momentumScore = this.calculateProductivityMomentum(session);
    
    return (consistencyScore + rhythmScore + momentumScore) / 3;
  }
  
  private calculateActivityConsistency(session: ProcessedSession): number {
    // Measure how consistent the activity types are
    const activityTypes = session.activities.map(a => a.activityType);
    const uniqueTypes = new Set(activityTypes);
    
    // More consistent = fewer unique activity types relative to duration
    const consistencyRatio = 1 - (uniqueTypes.size / activityTypes.length);
    return Math.max(0, Math.min(1, consistencyRatio * 2)); // Scale 0-1
  }
}
```

#### Step 17: Context Switch Detection
**File: `packages/analytics/src/context-switch-detector.ts`**
```typescript
export class ContextSwitchDetector {
  detectSwitches(activities: ActivityEvent[]): ContextSwitch[] {
    const switches: ContextSwitch[] = [];
    let currentContext: Context | null = null;
    
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      const newContext = this.extractContext(activity);
      
      if (currentContext && !this.isSameContext(currentContext, newContext)) {
        const switchData = this.analyzeContextSwitch(
          currentContext,
          newContext,
          activity,
          activities.slice(Math.max(0, i - 5), i) // Context for analysis
        );
        
        switches.push(switchData);
      }
      
      currentContext = newContext;
    }
    
    return switches;
  }
  
  private classifySwitchType(
    fromContext: Context,
    toContext: Context,
    trigger: ActivityEvent
  ): SwitchType {
    // Rule-based classification
    if (this.isDistractionSwitch(fromContext, toContext)) {
      return 'distraction';
    } else if (this.isInterruptionSwitch(trigger)) {
      return 'interruption';
    } else if (this.isPlannedSwitch(fromContext, toContext)) {
      return 'planned';
    } else {
      return 'reactive';
    }
  }
  
  private estimateRecoveryTime(
    fromContext: Context,
    toContext: Context,
    switchType: SwitchType
  ): number {
    // Base recovery times by switch type
    const baseRecoveryTimes = {
      'distraction': 15, // 15 minutes average
      'interruption': 10,
      'planned': 3,
      'reactive': 7
    };
    
    // Adjust based on context complexity
    const complexityMultiplier = this.calculateContextComplexity(fromContext);
    
    return baseRecoveryTimes[switchType] * complexityMultiplier;
  }
}
```

### Week 8: AI-Powered Insights & Testing

#### Step 18: Distraction Detection AI (Agent: `ai-engineer`)
**File: `packages/analytics/src/distraction-detector.ts`**
```typescript
export class SmartDistractionDetector {
  private readonly SEQUENCE_LENGTH = 20; // Look at last 20 activities
  
  async detectRealTimeDistractions(
    currentActivity: ActivityEvent,
    recentHistory: ActivityEvent[],
    userProfile: UserDistractionProfile
  ): Promise<DistractionAlert[]> {
    const alerts: DistractionAlert[] = [];
    
    // Multi-layered detection approach
    const rapidSwitchingAlert = this.detectRapidSwitching(recentHistory, userProfile);
    const timeWastingAlert = this.detectTimeWasting(currentActivity, recentHistory);
    const focusAlert = this.detectFocusDegradation(recentHistory, userProfile);
    const predictiveAlert = await this.predictUpcomingDistraction(
      currentActivity, 
      recentHistory, 
      userProfile
    );
    
    [rapidSwitchingAlert, timeWastingAlert, focusAlert, predictiveAlert]
      .filter(Boolean)
      .forEach(alert => {
        if (this.shouldTriggerAlert(alert!, userProfile)) {
          alerts.push(alert!);
        }
      });
    
    return alerts;
  }
  
  private async predictUpcomingDistraction(
    currentActivity: ActivityEvent,
    history: ActivityEvent[],
    profile: UserDistractionProfile
  ): Promise<DistractionAlert | null> {
    // Use historical patterns to predict potential distractions
    const features = this.extractPredictionFeatures(currentActivity, history);
    const prediction = await this.runPredictionModel(features, profile);
    
    if (prediction.probability > 0.7) { // High confidence threshold
      return {
        id: this.generateId(),
        timestamp: new Date(),
        alertType: 'productivity_drop',
        severity: prediction.probability > 0.9 ? 'high' : 'medium',
        description: `High likelihood of distraction in next ${prediction.timeWindow} minutes`,
        suggestedActions: this.generatePreventativeActions(prediction),
        confidence: prediction.probability,
        shouldNotify: true
      };
    }
    
    return null;
  }
  
  private generatePreventativeActions(prediction: DistractionPrediction): string[] {
    const actions = [];
    
    if (prediction.likelySource === 'social_media') {
      actions.push('Consider using a website blocker');
      actions.push('Move your phone to another room');
    }
    
    if (prediction.likelySource === 'context_switching') {
      actions.push('Close unnecessary applications');
      actions.push('Write down tasks to batch them later');
    }
    
    actions.push('Take a 2-minute mindfulness break');
    actions.push('Set a specific mini-goal for the next 15 minutes');
    
    return actions;
  }
}
```

#### Step 19: Comprehensive Testing Suite (Agent: `test-writer-fixer`)
**File: `tests/e2e/full-workflow.test.ts`**
```typescript
import { test, expect } from '@playwright/test';

test.describe('DevPulse Full Workflow', () => {
  test('complete productivity tracking workflow', async ({ page }) => {
    // 1. Desktop app starts tracking
    await page.goto('http://localhost:3000');
    
    // 2. Verify real-time activity appears in dashboard
    await expect(page.locator('[data-testid="current-activity"]')).toBeVisible();
    
    // 3. Start a focus session
    await page.click('[data-testid="start-focus-session"]');
    await page.fill('[data-testid="session-duration"]', '25');
    await page.click('[data-testid="confirm-focus-session"]');
    
    // 4. Verify focus session is active
    await expect(page.locator('[data-testid="active-focus-session"]')).toBeVisible();
    
    // 5. Check analytics are being generated
    await page.click('[data-testid="analytics-tab"]');
    await expect(page.locator('[data-testid="deep-work-score"]')).toBeVisible();
    
    // 6. Test integration connections
    await page.click('[data-testid="settings-tab"]');
    await page.click('[data-testid="integrations-section"]');
    
    // Mock GitHub OAuth flow
    await page.click('[data-testid="connect-github"]');
    // OAuth flow would be mocked in test environment
    
    // 7. Verify data sync
    await expect(page.locator('[data-testid="sync-status"]')).toContainText('Synced');
  });
  
  test('AI insights generation', async ({ page }) => {
    await page.goto('http://localhost:3000/analytics');
    
    // Load test data
    await page.evaluate(() => {
      window.loadTestProductivityData();
    });
    
    // Wait for AI analysis
    await page.waitForSelector('[data-testid="ai-insights"]');
    
    // Verify insights are generated
    await expect(page.locator('[data-testid="deep-work-score"]')).toHaveText(/\d+/);
    await expect(page.locator('[data-testid="productivity-trend"]')).toBeVisible();
    await expect(page.locator('[data-testid="recommendations"]')).toBeVisible();
    
    // Test distraction alerts
    await page.evaluate(() => {
      window.simulateDistractionPattern();
    });
    
    await expect(page.locator('[data-testid="distraction-alert"]')).toBeVisible();
  });
});
```

#### Step 20: Performance Testing
**File: `tests/performance/analytics-benchmark.test.ts`**
```typescript
import { performance } from 'perf_hooks';

describe('Analytics Performance', () => {
  test('deep work calculation performance', () => {
    const largeDataset = generateTestActivities(10000); // 10k activities
    
    const start = performance.now();
    const deepWorkScore = deepWorkScorer.calculateScore(largeDataset);
    const end = performance.now();
    
    const executionTime = end - start;
    
    expect(executionTime).toBeLessThan(2000); // Under 2 seconds
    expect(deepWorkScore.overall).toBeGreaterThanOrEqual(0);
    expect(deepWorkScore.overall).toBeLessThanOrEqual(100);
  });
  
  test('real-time processing latency', async () => {
    const activityStream = createMockActivityStream();
    
    for (const activity of activityStream) {
      const start = performance.now();
      
      const alerts = await distractionDetector.detectRealTimeDistractions(
        activity,
        [],
        mockUserProfile
      );
      
      const end = performance.now();
      const latency = end - start;
      
      expect(latency).toBeLessThan(100); // Under 100ms for real-time
    }
  });
});
```

---

## Deployment & DevOps

### Step 21: Docker Configuration (Agent: `devops-automator`)
**File: `docker-compose.yml`**
```yaml
version: '3.8'

services:
  desktop-tracker:
    build:
      context: ./apps/desktop
      dockerfile: Dockerfile
    volumes:
      - user_data:/app/data
    
  dashboard:
    build:
      context: ./apps/dashboard
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    depends_on:
      - sync-backend
    environment:
      - NEXT_PUBLIC_API_URL=http://sync-backend:3001
      
  sync-backend:
    build:
      context: ./apps/sync-backend
      dockerfile: Dockerfile
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - redis
    environment:
      - DATABASE_URL=postgresql://devpulse:password@postgres:5432/devpulse
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=your-secret-key
      
  postgres:
    image: postgres:16
    environment:
      - POSTGRES_DB=devpulse
      - POSTGRES_USER=devpulse
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

volumes:
  user_data:
  postgres_data:
  redis_data:
```

### Step 22: CI/CD Pipeline
**File: `.github/workflows/deploy.yml`**
```yaml
name: Deploy DevPulse

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build Desktop App
        run: |
          cd apps/desktop
          npm ci
          npm run build
          npm run package
          
      - name: Build Dashboard
        run: |
          cd apps/dashboard
          npm ci
          npm run build
          
      - name: Build Backend
        run: |
          cd apps/sync-backend
          npm ci
          npm run build
          
      - name: Deploy to AWS
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-west-2
          
      - name: Deploy ECS Service
        run: |
          aws ecs update-service --cluster devpulse-cluster --service devpulse-backend --force-new-deployment
```

---

## Final Integration & Quality Assurance

### Step 23: End-to-End Testing
1. **Manual Testing Checklist:**
   - [ ] Desktop app starts and tracks activity correctly
   - [ ] Dashboard displays real-time data
   - [ ] Focus sessions work properly
   - [ ] All charts and visualizations render correctly
   - [ ] GitHub integration connects and syncs commits
   - [ ] Slack status updates work
   - [ ] Calendar integration creates focus blocks
   - [ ] AI insights generate meaningful recommendations
   - [ ] Privacy controls function properly
   - [ ] Data export works in all formats

### Step 24: Performance Optimization
1. **Database Optimization:**
   ```sql
   -- Add critical indexes
   CREATE INDEX CONCURRENTLY idx_activity_logs_user_time ON activity_logs(user_id, started_at DESC);
   CREATE INDEX CONCURRENTLY idx_focus_sessions_active ON focus_sessions(user_id, ended_at) WHERE ended_at IS NULL;
   ```

2. **Frontend Optimization:**
   ```typescript
   // Implement virtual scrolling for large datasets
   // Add proper memoization for expensive calculations
   // Use React.lazy for code splitting
   ```

### Step 25: Documentation
1. **User Documentation:**
   - Getting started guide
   - Privacy and security explanation
   - Integration setup instructions
   - Troubleshooting guide

2. **Developer Documentation:**
   - API documentation
   - Database schema documentation
   - Architecture overview
   - Contributing guidelines

---

## Launch Preparation

### Step 26: Security Audit
- [ ] Penetration testing completed
- [ ] Data encryption verified
- [ ] OAuth implementations audited
- [ ] Privacy compliance verified
- [ ] Rate limiting tested

### Step 27: Performance Validation
- [ ] Load testing with 1000+ concurrent users
- [ ] Memory usage under 50MB for desktop app
- [ ] Dashboard loads in under 2 seconds
- [ ] AI processing completes in under 2 seconds
- [ ] Database queries optimized

### Step 28: User Acceptance Testing
- [ ] Beta user feedback incorporated
- [ ] Accessibility compliance verified
- [ ] Cross-platform compatibility confirmed
- [ ] Integration reliability validated

---

## Success Metrics & KPIs

### Technical Metrics
- **Performance**: <2s page loads, <100ms API responses
- **Reliability**: 99.9% uptime, graceful error handling
- **Privacy**: Zero data leaks, successful privacy audits
- **Accuracy**: >95% activity detection, >90% context switch detection

### User Experience Metrics
- **Onboarding**: <5 minutes from install to insights
- **Value Time**: Actionable insights within first day
- **Retention**: >70% weekly active usage after month 1
- **Satisfaction**: >4.5/5 user rating

This comprehensive walkthrough provides everything needed to implement DevPulse from scratch, following the exact phase structure and agent assignments defined in the project plan. Each step includes specific code examples, configuration files, and implementation guidance to ensure successful delivery within the 8-week timeline.