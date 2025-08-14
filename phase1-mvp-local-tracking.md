# Phase 1: MVP Local Tracking (Weeks 1-2)

## Overview
Build the core desktop application that monitors developer activity locally with complete privacy. This phase establishes the foundation for all subsequent features.

## Agent Assignment
- **Primary Agent**: `mobile-app-builder` - Desktop application development
- **Supporting Agent**: `backend-architect` - Local database and data architecture

## Objectives
1. Create a functional desktop tracker that runs on Windows, macOS, and Linux
2. Implement privacy-first activity monitoring without keylogging or screen capture
3. Build local SQLite database for storing activity data
4. Develop project detection and context switching logic
5. Create basic system tray interface for user control

## Technical Requirements

### Desktop Application Framework
**Decision: Electron vs Tauri**
- **Recommended**: Start with Electron for faster development, consider Tauri for v2
- **Reasoning**: Electron has better ecosystem, easier cross-platform development
- **Performance Target**: <50MB RAM, <5% CPU usage during active monitoring

### Core Components to Build

#### 1. Activity Monitor Service
```typescript
interface ActivityMonitor {
  startMonitoring(): Promise<void>;
  stopMonitoring(): Promise<void>;
  getCurrentActivity(): ActivityEvent | null;
  getSystemIdleTime(): number;
}

interface ActivityEvent {
  id: string;
  timestamp: Date;
  appName: string;
  windowTitle: string;
  filePath?: string;
  projectPath?: string;
  activityType: 'code' | 'build' | 'test' | 'debug' | 'other';
  isIdle: boolean;
}
```

**Implementation Tasks for `mobile-app-builder`:**
- Set up Electron application with TypeScript
- Implement cross-platform window detection APIs
- Create activity event capture system
- Build idle detection logic (configurable timeout)
- Add privacy filters (no content capture, only metadata)

#### 2. Project Detection Engine
```typescript
interface ProjectDetector {
  detectProjectFromPath(filePath: string): Project | null;
  scanForProjects(rootPaths: string[]): Project[];
  watchProjectChanges(): void;
}

interface Project {
  id: string;
  name: string;
  path: string;
  gitRemoteUrl?: string;
  lastActivity: Date;
  tags: string[];
  color?: string;
}
```

**Implementation Tasks for `mobile-app-builder`:**
- Git repository detection via `.git` folder scanning
- Project name extraction from package.json, Cargo.toml, etc.
- Automatic project discovery from common dev folders
- Manual project addition/editing interface
- Project tagging and categorization

#### 3. Local Database Layer
```sql
-- SQLite Schema for Phase 1
CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL UNIQUE,
  git_remote_url TEXT,
  tags TEXT, -- JSON array
  color TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE activity_logs (
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
  metadata TEXT, -- JSON object
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE TABLE user_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Implementation Tasks for `backend-architect`:**
- Set up SQLite database with proper migrations
- Create TypeScript interfaces for all entities
- Implement database access layer with proper connection pooling
- Add data validation and constraint checking
- Build data export functionality (JSON, CSV)

#### 4. System Tray Interface
```typescript
interface SystemTrayController {
  createTray(): void;
  updateStatus(status: 'tracking' | 'paused' | 'offline'): void;
  showContextMenu(): void;
  handleTrayClick(): void;
}
```

**Implementation Tasks for `mobile-app-builder`:**
- Create system tray icon with status indicators
- Build context menu with start/stop/settings options
- Implement quick project switching
- Add focus mode toggle
- Show current session statistics

### Privacy Controls Implementation

#### 1. Data Collection Settings
- **Configurable Monitoring**: Choose which applications to monitor
- **File Path Filtering**: Option to exclude sensitive directories
- **Idle Time Threshold**: Customizable idle detection (1-30 minutes)
- **Data Retention**: Automatic cleanup of old data (configurable)

#### 2. Privacy-First Design Principles
```typescript
interface PrivacyController {
  shouldTrackApplication(appName: string): boolean;
  sanitizeWindowTitle(title: string, appName: string): string;
  filterSensitivePaths(filePath: string): boolean;
  anonymizeData(activityEvent: ActivityEvent): ActivityEvent;
}
```

**Implementation Requirements:**
- No keystroke or mouse click recording
- Window titles sanitized to remove sensitive content
- File paths can be excluded by pattern matching
- All data stored locally by default
- Easy data deletion and export

### Application Architecture

#### Directory Structure
```
apps/desktop/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── activity-monitor.ts
│   │   ├── project-detector.ts
│   │   ├── database.ts
│   │   └── main.ts
│   ├── renderer/             # Electron renderer process
│   │   ├── components/
│   │   ├── pages/
│   │   └── app.tsx
│   ├── shared/               # Shared types and utilities
│   │   ├── types.ts
│   │   └── constants.ts
│   └── preload/              # Electron preload scripts
│       └── api.ts
├── assets/                   # Icons, images
├── migrations/               # Database migrations
├── package.json
├── electron-builder.config.js
└── tsconfig.json
```

#### Tech Stack Details
- **Framework**: Electron 28+ with TypeScript
- **Database**: SQLite3 with better-sqlite3 driver
- **UI**: React 18 + Tailwind CSS for settings interface
- **State Management**: Zustand for simple state management
- **Build Tool**: Vite for fast development
- **Testing**: Jest for unit tests, Spectron for E2E

### Key Features for Phase 1

#### 1. Activity Monitoring
- **Real-time tracking** of active applications
- **IDE detection** for VS Code, JetBrains IDEs, Vim, Emacs
- **Terminal monitoring** for bash, zsh, PowerShell, Command Prompt
- **Browser dev tools** detection (DevTools open in Chrome/Firefox)
- **Build tool recognition** (npm, yarn, cargo, gradle, etc.)

#### 2. Intelligent Classification
```typescript
enum ActivityType {
  CODING = 'coding',
  DEBUGGING = 'debugging', 
  TESTING = 'testing',
  BUILDING = 'building',
  RESEARCHING = 'researching', // Browser, docs
  COMMUNICATION = 'communication', // Slack, email
  OTHER = 'other'
}
```

**Classification Rules:**
- File extensions (.js, .py, .rs, etc.) → CODING
- Debug keywords in window titles → DEBUGGING  
- Test file patterns → TESTING
- Build command patterns → BUILDING
- Browser with dev-related domains → RESEARCHING

#### 3. Session Management
- **Automatic session detection** based on activity patterns
- **Manual session controls** (start/stop/pause)
- **Idle handling** with configurable thresholds
- **Session persistence** across application restarts
- **Focus mode** with notification blocking

### Error Handling & Edge Cases

#### 1. System Integration Issues
- **Permission handling**: Request accessibility permissions on macOS
- **Windows UAC**: Handle elevated permission requirements
- **Linux compatibility**: Support for different window managers
- **Multi-monitor setups**: Proper window detection across displays

#### 2. Data Integrity
- **Database corruption**: Automatic backup and recovery
- **Concurrent access**: Handle multiple application instances
- **Storage limits**: Automatic cleanup of old data
- **Migration failures**: Rollback mechanisms for schema updates

#### 3. Performance Optimization
- **Memory leaks**: Proper cleanup of event listeners
- **CPU usage**: Efficient polling intervals (1-5 seconds)
- **Battery life**: Reduce activity during low battery
- **Background operation**: Minimal resource usage when idle

### Testing Strategy

#### Unit Tests (Jest)
```typescript
// Example test structure
describe('ActivityMonitor', () => {
  test('should detect VS Code activity', () => {
    const monitor = new ActivityMonitor();
    const event = monitor.classifyActivity('Visual Studio Code', 'src/main.ts');
    expect(event.activityType).toBe(ActivityType.CODING);
    expect(event.projectPath).toContain('src');
  });
});
```

#### Integration Tests
- Database operations with real SQLite
- File system project detection
- Cross-platform window detection APIs
- Privacy filter functionality

#### Performance Tests
- Memory usage under continuous tracking
- CPU impact during heavy development activity
- Database query performance with large datasets
- Application startup and shutdown times

### Deliverables for Phase 1

#### Week 1 Deliverables
1. **Electron application setup** with TypeScript and build configuration
2. **Basic activity monitoring** for primary IDEs and terminals
3. **SQLite database** with core schema and migrations
4. **Project detection** for Git repositories and common project structures
5. **System tray interface** with basic controls

#### Week 2 Deliverables
1. **Complete activity classification** system with all supported application types
2. **Privacy controls** with configurable monitoring settings
3. **Data export functionality** (JSON/CSV formats)
4. **Session management** with idle detection and focus mode
5. **Cross-platform testing** and deployment packages

### Success Criteria
- ✅ Application runs on Windows, macOS, and Linux
- ✅ Accurate activity detection for 10+ common development tools
- ✅ Privacy-compliant monitoring (no keylogging or content capture)
- ✅ Local SQLite database with proper data persistence
- ✅ Project detection accuracy >90% for Git-based projects
- ✅ Memory usage <50MB during active monitoring
- ✅ CPU usage <5% during normal development activity

### Handoff to Phase 2
Phase 1 provides the data foundation for Phase 2's dashboard. Key outputs:
- **Local SQLite database** with activity logs and project data
- **Activity monitoring APIs** for real-time data access
- **Project context** information for dashboard filtering
- **Privacy settings** to be reflected in dashboard controls
- **Data export formats** for dashboard import functionality

The database and monitoring APIs from Phase 1 will be directly consumed by the dashboard in Phase 2, ensuring seamless integration between the desktop tracker and web interface.