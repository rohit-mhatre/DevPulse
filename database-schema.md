# DevPulse Database Schema

## Overview
DevPulse uses a hybrid database approach with SQLite for local storage and PostgreSQL for optional cloud sync. This design ensures privacy-first operation while enabling cross-device synchronization and advanced analytics.

## Database Architecture

### Local Database (SQLite)
- **Purpose**: Primary data storage for all user activity
- **Location**: User's local machine
- **Features**: Fast queries, offline operation, privacy-first
- **Size**: Optimized for personal productivity data (~100MB typical)

### Cloud Database (PostgreSQL)
- **Purpose**: Encrypted sync, multi-device support, integrations
- **Location**: AWS RDS or similar cloud service
- **Features**: ACID compliance, advanced analytics, concurrent access
- **Security**: All user data encrypted at application level

## Entity Relationship Diagram

```
DevPulse Database Schema Relationships

┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│    users    │     │   user_sessions │     │ user_settings│
│             │────▶│                 │     │             │
│ id (PK)     │     │ user_id (FK)    │     │ user_id (FK)│
│ email       │     │ session_token   │     │ key         │
│ created_at  │     │ expires_at      │     │ value       │
└─────────────┘     └─────────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐     ┌─────────────────┐     ┌─────────────┐
│  projects   │     │ activity_logs   │     │focus_sessions│
│             │◀────│                 │     │             │
│ id (PK)     │     │ id (PK)         │     │ id (PK)     │
│ user_id(FK) │     │ user_id (FK)    │     │ user_id(FK) │
│ name        │     │ project_id (FK) │     │project_id(FK)│
│ path        │     │ activity_type   │     │ started_at  │
│ git_url     │     │ started_at      │     │ ended_at    │
└─────────────┘     │ duration        │     │ goal_mins   │
       │            │ app_name        │     └─────────────┘
       ▼            └─────────────────┘
┌─────────────┐              │
│project_tags │              ▼
│             │     ┌─────────────────┐     ┌─────────────┐
│project_id(FK)│     │context_switches │     │distractions │
│ tag_name    │     │                 │     │             │
│ color       │     │ id (PK)         │     │ id (PK)     │
└─────────────┘     │ user_id (FK)    │     │ user_id(FK) │
                    │ from_project_id │     │ source      │
                    │ to_project_id   │     │ occurred_at │
                    │ occurred_at     │     │ duration    │
                    │ switch_reason   │     └─────────────┘
                    └─────────────────┘

┌──────────────────┐ ┌─────────────────┐ ┌──────────────────┐
│integration_tokens│ │external_data_cache│ │   sync_conflicts │
│                  │ │                 │ │                  │
│ id (PK)          │ │ id (PK)         │ │ id (PK)          │
│ user_id (FK)     │ │ user_id (FK)    │ │ user_id (FK)     │
│ provider         │ │ provider        │ │ table_name       │
│ encrypted_token  │ │ data_type       │ │ local_version    │
│ expires_at       │ │ cached_data     │ │ remote_version   │
└──────────────────┘ │ expires_at      │ │ conflict_type    │
                     └─────────────────┘ │ resolved_at      │
                                         └──────────────────┘
```

## Core Tables (SQLite Local Schema)

### 1. Users Table
```sql
-- Local SQLite version (simplified for single user)
CREATE TABLE users (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT UNIQUE,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    timezone TEXT DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for updated_at
CREATE TRIGGER users_updated_at 
    AFTER UPDATE ON users
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

### 2. Projects Table
```sql
CREATE TABLE projects (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    local_path TEXT UNIQUE,
    git_remote_url TEXT,
    repository_provider TEXT CHECK(repository_provider IN ('github', 'gitlab', 'bitbucket', 'other')),
    default_branch TEXT DEFAULT 'main',
    color TEXT CHECK(length(color) = 7 AND color LIKE '#%'), -- Hex color
    is_active BOOLEAN DEFAULT 1,
    total_time_seconds INTEGER DEFAULT 0,
    last_activity_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(name, user_id)
);

-- Indexes for performance
CREATE INDEX idx_projects_user_active ON projects(user_id, is_active);
CREATE INDEX idx_projects_path ON projects(local_path);
CREATE INDEX idx_projects_last_activity ON projects(last_activity_at DESC);

-- Trigger for updated_at
CREATE TRIGGER projects_updated_at 
    AFTER UPDATE ON projects
BEGIN
    UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

### 3. Project Tags Table
```sql
CREATE TABLE project_tags (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    project_id TEXT NOT NULL,
    tag_name TEXT NOT NULL,
    tag_color TEXT CHECK(length(tag_color) = 7 AND tag_color LIKE '#%'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(project_id, tag_name)
);

CREATE INDEX idx_project_tags_project ON project_tags(project_id);
```

### 4. Activity Logs Table
```sql
CREATE TABLE activity_logs (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    project_id TEXT,
    activity_type TEXT NOT NULL CHECK(activity_type IN (
        'coding', 'debugging', 'testing', 'building', 
        'researching', 'communication', 'planning', 'other'
    )),
    application_name TEXT,
    window_title TEXT,
    file_path TEXT,
    file_extension TEXT,
    git_branch TEXT,
    git_commit_hash TEXT,
    
    -- Activity metrics
    duration_seconds INTEGER NOT NULL CHECK(duration_seconds >= 0),
    keystrokes INTEGER DEFAULT 0,
    mouse_clicks INTEGER DEFAULT 0,
    idle_time_seconds INTEGER DEFAULT 0,
    
    -- Productivity scoring
    productivity_score REAL CHECK(productivity_score >= 0 AND productivity_score <= 100),
    focus_score REAL CHECK(focus_score >= 0 AND focus_score <= 100),
    
    -- Timestamps
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP NOT NULL,
    
    -- Additional data (JSON)
    metadata TEXT, -- JSON string for additional context
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    
    CHECK(ended_at > started_at),
    CHECK(duration_seconds = (strftime('%s', ended_at) - strftime('%s', started_at)))
);

-- Critical indexes for analytics queries
CREATE INDEX idx_activity_logs_user_time ON activity_logs(user_id, started_at DESC);
CREATE INDEX idx_activity_logs_project_time ON activity_logs(project_id, started_at DESC);
CREATE INDEX idx_activity_logs_type_time ON activity_logs(activity_type, started_at DESC);
CREATE INDEX idx_activity_logs_duration ON activity_logs(duration_seconds DESC);
CREATE INDEX idx_activity_logs_productivity ON activity_logs(productivity_score DESC);
CREATE INDEX idx_activity_logs_timerange ON activity_logs(started_at, ended_at);
```

### 5. Focus Sessions Table
```sql
CREATE TABLE focus_sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    project_id TEXT,
    session_type TEXT DEFAULT 'deep_work' CHECK(session_type IN (
        'deep_work', 'pomodoro', 'timeboxing', 'flow', 'break'
    )),
    
    -- Session planning
    planned_duration_minutes INTEGER,
    planned_goals TEXT, -- JSON array of goals
    
    -- Session execution
    actual_duration_minutes INTEGER,
    goals_completed TEXT, -- JSON array of completed goals
    interruption_count INTEGER DEFAULT 0,
    context_switches INTEGER DEFAULT 0,
    
    -- Flow state detection
    flow_state_achieved BOOLEAN DEFAULT 0,
    flow_state_duration_minutes INTEGER DEFAULT 0,
    flow_confidence_score REAL CHECK(flow_confidence_score >= 0 AND flow_confidence_score <= 1),
    
    -- User feedback
    productivity_rating INTEGER CHECK(productivity_rating >= 1 AND productivity_rating <= 5),
    energy_level_before INTEGER CHECK(energy_level_before >= 1 AND energy_level_before <= 5),
    energy_level_after INTEGER CHECK(energy_level_after >= 1 AND energy_level_after <= 5),
    satisfaction_rating INTEGER CHECK(satisfaction_rating >= 1 AND satisfaction_rating <= 5),
    
    -- Session notes
    notes TEXT,
    distraction_sources TEXT, -- JSON array
    
    -- Timestamps
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    paused_duration_minutes INTEGER DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    
    CHECK(ended_at IS NULL OR ended_at > started_at),
    CHECK(actual_duration_minutes IS NULL OR actual_duration_minutes >= 0),
    CHECK(flow_state_duration_minutes <= actual_duration_minutes)
);

-- Indexes for focus session analytics
CREATE INDEX idx_focus_sessions_user_time ON focus_sessions(user_id, started_at DESC);
CREATE INDEX idx_focus_sessions_project ON focus_sessions(project_id, started_at DESC);
CREATE INDEX idx_focus_sessions_type ON focus_sessions(session_type, started_at DESC);
CREATE INDEX idx_focus_sessions_flow ON focus_sessions(flow_state_achieved, started_at DESC);
CREATE INDEX idx_focus_sessions_active ON focus_sessions(user_id, ended_at) WHERE ended_at IS NULL;

-- Trigger for updated_at
CREATE TRIGGER focus_sessions_updated_at 
    AFTER UPDATE ON focus_sessions
BEGIN
    UPDATE focus_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

### 6. Context Switches Table
```sql
CREATE TABLE context_switches (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    from_project_id TEXT,
    to_project_id TEXT,
    from_activity_type TEXT,
    to_activity_type TEXT,
    
    -- Switch classification
    switch_reason TEXT CHECK(switch_reason IN (
        'interruption', 'planned', 'break', 'urgent', 'distraction', 'completion'
    )),
    switch_trigger TEXT CHECK(switch_trigger IN (
        'notification', 'manual', 'calendar', 'external', 'automatic'
    )),
    
    -- Productivity impact
    productivity_impact_score REAL CHECK(
        productivity_impact_score >= -10 AND productivity_impact_score <= 10
    ),
    context_recovery_time_minutes INTEGER CHECK(context_recovery_time_minutes >= 0),
    time_since_last_switch_minutes INTEGER,
    
    -- Detection confidence
    detection_confidence REAL CHECK(detection_confidence >= 0 AND detection_confidence <= 1),
    
    occurred_at TIMESTAMP NOT NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (from_project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (to_project_id) REFERENCES projects(id) ON DELETE SET NULL
);

-- Indexes for context switch analysis
CREATE INDEX idx_context_switches_user_time ON context_switches(user_id, occurred_at DESC);
CREATE INDEX idx_context_switches_from_project ON context_switches(from_project_id, occurred_at DESC);
CREATE INDEX idx_context_switches_to_project ON context_switches(to_project_id, occurred_at DESC);
CREATE INDEX idx_context_switches_reason ON context_switches(switch_reason, occurred_at DESC);
CREATE INDEX idx_context_switches_impact ON context_switches(productivity_impact_score, occurred_at DESC);
```

### 7. Distractions Table
```sql
CREATE TABLE distractions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    project_id TEXT,
    focus_session_id TEXT,
    
    -- Distraction details
    distraction_type TEXT CHECK(distraction_type IN (
        'notification', 'social_media', 'communication', 'browsing', 
        'system_interruption', 'physical_interruption', 'mental_wandering'
    )),
    source_application TEXT,
    distraction_title TEXT,
    severity TEXT CHECK(severity IN ('low', 'medium', 'high')),
    
    -- Duration and impact
    duration_seconds INTEGER DEFAULT 0 CHECK(duration_seconds >= 0),
    recovery_time_seconds INTEGER CHECK(recovery_time_seconds >= 0),
    productivity_impact REAL CHECK(productivity_impact >= -10 AND productivity_impact <= 0),
    
    -- Detection and user feedback
    detected_automatically BOOLEAN DEFAULT 0,
    user_confirmed BOOLEAN,
    user_rating INTEGER CHECK(user_rating >= 1 AND user_rating <= 5),
    
    occurred_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    FOREIGN KEY (focus_session_id) REFERENCES focus_sessions(id) ON DELETE SET NULL,
    
    CHECK(ended_at IS NULL OR ended_at > occurred_at)
);

-- Indexes for distraction analytics
CREATE INDEX idx_distractions_user_time ON distractions(user_id, occurred_at DESC);
CREATE INDEX idx_distractions_type ON distractions(distraction_type, occurred_at DESC);
CREATE INDEX idx_distractions_severity ON distractions(severity, occurred_at DESC);
CREATE INDEX idx_distractions_session ON distractions(focus_session_id);
```

### 8. User Settings Table
```sql
CREATE TABLE user_settings (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL,
    category TEXT NOT NULL, -- 'privacy', 'tracking', 'notifications', 'integrations'
    setting_key TEXT NOT NULL,
    setting_value TEXT NOT NULL,
    value_type TEXT DEFAULT 'string' CHECK(value_type IN ('string', 'number', 'boolean', 'json')),
    is_encrypted BOOLEAN DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(user_id, category, setting_key)
);

CREATE INDEX idx_user_settings_user_category ON user_settings(user_id, category);

-- Trigger for updated_at
CREATE TRIGGER user_settings_updated_at 
    AFTER UPDATE ON user_settings
BEGIN
    UPDATE user_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

## Cloud Sync Tables (PostgreSQL Schema)

### 1. Cloud Users Table
```sql
-- PostgreSQL version with enhanced features
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE,
    full_name VARCHAR(255),
    encrypted_password VARCHAR(255),
    avatar_url VARCHAR(500),
    timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Account status
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    subscription_tier VARCHAR(20) DEFAULT 'free' CHECK(subscription_tier IN ('free', 'pro', 'team')),
    
    -- Sync preferences
    sync_enabled BOOLEAN DEFAULT false,
    sync_frequency_minutes INTEGER DEFAULT 60,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    
    -- Privacy settings
    data_retention_days INTEGER DEFAULT 365,
    anonymize_data BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX idx_users_last_sync ON users(last_sync_at);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2. Encrypted Data Sync Table
```sql
CREATE TABLE user_data_sync (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Data identification
    data_type VARCHAR(50) NOT NULL CHECK(data_type IN (
        'projects', 'activity_logs', 'focus_sessions', 
        'context_switches', 'user_settings', 'distractions'
    )),
    entity_id VARCHAR(50) NOT NULL, -- Local entity ID
    
    -- Encrypted data
    encrypted_data BYTEA NOT NULL,
    encryption_algorithm VARCHAR(20) DEFAULT 'AES-256-GCM',
    data_checksum VARCHAR(64) NOT NULL,
    
    -- Versioning
    version INTEGER DEFAULT 1,
    parent_version INTEGER,
    is_deleted BOOLEAN DEFAULT false,
    
    -- Device tracking
    device_id VARCHAR(100) NOT NULL,
    device_name VARCHAR(100),
    
    -- Timestamps
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    local_updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    UNIQUE(user_id, data_type, entity_id, device_id)
);

-- Indexes for sync operations
CREATE INDEX idx_user_data_sync_user_type ON user_data_sync(user_id, data_type);
CREATE INDEX idx_user_data_sync_device ON user_data_sync(user_id, device_id);
CREATE INDEX idx_user_data_sync_version ON user_data_sync(user_id, data_type, version DESC);
CREATE INDEX idx_user_data_sync_updated ON user_data_sync(user_id, local_updated_at DESC);
```

### 3. Integration Tokens Table
```sql
CREATE TABLE integration_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Provider information
    provider VARCHAR(50) NOT NULL CHECK(provider IN (
        'github', 'gitlab', 'bitbucket', 'slack', 'discord', 
        'google_calendar', 'microsoft_calendar', 'notion'
    )),
    provider_user_id VARCHAR(200),
    provider_username VARCHAR(200),
    
    -- Token data (encrypted)
    encrypted_access_token BYTEA NOT NULL,
    encrypted_refresh_token BYTEA,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Permissions and scope
    scopes TEXT[] DEFAULT '{}',
    granted_permissions JSONB DEFAULT '{}',
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP WITH TIME ZONE,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, provider)
);

-- Indexes
CREATE INDEX idx_integration_tokens_user_provider ON integration_tokens(user_id, provider);
CREATE INDEX idx_integration_tokens_active ON integration_tokens(is_active, last_used_at DESC);
CREATE INDEX idx_integration_tokens_expires ON integration_tokens(token_expires_at) 
    WHERE token_expires_at IS NOT NULL;

-- Updated timestamp trigger
CREATE TRIGGER update_integration_tokens_updated_at BEFORE UPDATE ON integration_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 4. External Data Cache Table
```sql
CREATE TABLE external_data_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Data source
    provider VARCHAR(50) NOT NULL,
    data_type VARCHAR(50) NOT NULL CHECK(data_type IN (
        'commits', 'pull_requests', 'issues', 'calendar_events', 
        'slack_messages', 'repository_info', 'user_status'
    )),
    external_id VARCHAR(200) NOT NULL,
    
    -- Cached data
    cached_data JSONB NOT NULL,
    data_hash VARCHAR(64), -- For change detection
    
    -- Cache management
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, provider, data_type, external_id)
);

-- Indexes for cache operations
CREATE INDEX idx_external_data_cache_user_provider ON external_data_cache(user_id, provider, data_type);
CREATE INDEX idx_external_data_cache_expires ON external_data_cache(expires_at);
CREATE INDEX idx_external_data_cache_accessed ON external_data_cache(last_accessed_at);

-- GIN index for JSONB queries
CREATE INDEX idx_external_data_cache_data ON external_data_cache USING GIN(cached_data);
```

### 5. Sync Conflicts Table
```sql
CREATE TABLE sync_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Conflict details
    data_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    conflict_type VARCHAR(50) NOT NULL CHECK(conflict_type IN (
        'update_conflict', 'delete_conflict', 'create_conflict', 'schema_conflict'
    )),
    
    -- Conflict data
    local_version JSONB NOT NULL,
    remote_version JSONB NOT NULL,
    local_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    remote_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Resolution
    resolution_strategy VARCHAR(50) CHECK(resolution_strategy IN (
        'local_wins', 'remote_wins', 'merge', 'manual'
    )),
    resolved_version JSONB,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(50), -- 'system' or 'user'
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- Indexes for conflict resolution
CREATE INDEX idx_sync_conflicts_user_unresolved ON sync_conflicts(user_id, created_at DESC) 
    WHERE resolved_at IS NULL;
CREATE INDEX idx_sync_conflicts_type ON sync_conflicts(data_type, conflict_type);
CREATE INDEX idx_sync_conflicts_resolved ON sync_conflicts(resolved_at DESC);
```

## TypeScript Data Models

### Core Entity Interfaces
```typescript
// User interface
export interface User {
  id: string;
  email: string;
  username?: string;
  fullName?: string;
  avatarUrl?: string;
  timezone: string;
  isActive: boolean;
  emailVerified: boolean;
  subscriptionTier: 'free' | 'pro' | 'team';
  syncEnabled: boolean;
  dataRetentionDays: number;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

// Project interface
export interface Project {
  id: string;
  userId: string;
  name: string;
  description?: string;
  localPath?: string;
  gitRemoteUrl?: string;
  repositoryProvider?: 'github' | 'gitlab' | 'bitbucket' | 'other';
  defaultBranch: string;
  color?: string;
  isActive: boolean;
  totalTimeSeconds: number;
  tags: ProjectTag[];
  lastActivityAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectTag {
  id: string;
  projectId: string;
  tagName: string;
  tagColor?: string;
  createdAt: Date;
}

// Activity Log interface
export interface ActivityLog {
  id: string;
  userId: string;
  projectId?: string;
  activityType: 'coding' | 'debugging' | 'testing' | 'building' | 
                'researching' | 'communication' | 'planning' | 'other';
  applicationName?: string;
  windowTitle?: string;
  filePath?: string;
  fileExtension?: string;
  gitBranch?: string;
  gitCommitHash?: string;
  durationSeconds: number;
  keystrokes: number;
  mouseClicks: number;
  idleTimeSeconds: number;
  productivityScore?: number;
  focusScore?: number;
  startedAt: Date;
  endedAt: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
}

// Focus Session interface
export interface FocusSession {
  id: string;
  userId: string;
  projectId?: string;
  sessionType: 'deep_work' | 'pomodoro' | 'timeboxing' | 'flow' | 'break';
  plannedDurationMinutes?: number;
  plannedGoals: string[];
  actualDurationMinutes?: number;
  goalsCompleted: string[];
  interruptionCount: number;
  contextSwitches: number;
  flowStateAchieved: boolean;
  flowStateDurationMinutes: number;
  flowConfidenceScore?: number;
  productivityRating?: number; // 1-5
  energyLevelBefore?: number; // 1-5
  energyLevelAfter?: number; // 1-5
  satisfactionRating?: number; // 1-5
  notes?: string;
  distractionSources: string[];
  startedAt: Date;
  endedAt?: Date;
  pausedDurationMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

// Context Switch interface
export interface ContextSwitch {
  id: string;
  userId: string;
  fromProjectId?: string;
  toProjectId?: string;
  fromActivityType?: string;
  toActivityType?: string;
  switchReason: 'interruption' | 'planned' | 'break' | 'urgent' | 'distraction' | 'completion';
  switchTrigger: 'notification' | 'manual' | 'calendar' | 'external' | 'automatic';
  productivityImpactScore?: number; // -10 to +10
  contextRecoveryTimeMinutes?: number;
  timeSinceLastSwitchMinutes?: number;
  detectionConfidence?: number; // 0-1
  occurredAt: Date;
  notes?: string;
  createdAt: Date;
}

// Distraction interface
export interface Distraction {
  id: string;
  userId: string;
  projectId?: string;
  focusSessionId?: string;
  distractionType: 'notification' | 'social_media' | 'communication' | 
                   'browsing' | 'system_interruption' | 'physical_interruption' | 'mental_wandering';
  sourceApplication?: string;
  distractionTitle?: string;
  severity: 'low' | 'medium' | 'high';
  durationSeconds: number;
  recoveryTimeSeconds?: number;
  productivityImpact?: number; // -10 to 0
  detectedAutomatically: boolean;
  userConfirmed?: boolean;
  userRating?: number; // 1-5
  occurredAt: Date;
  endedAt?: Date;
  notes?: string;
  createdAt: Date;
}

// Sync and Integration types
export interface UserDataSync {
  id: string;
  userId: string;
  dataType: 'projects' | 'activity_logs' | 'focus_sessions' | 'context_switches' | 'user_settings' | 'distractions';
  entityId: string;
  encryptedData: Buffer;
  encryptionAlgorithm: string;
  dataChecksum: string;
  version: number;
  parentVersion?: number;
  isDeleted: boolean;
  deviceId: string;
  deviceName?: string;
  syncedAt: Date;
  localUpdatedAt: Date;
}

export interface IntegrationToken {
  id: string;
  userId: string;
  provider: 'github' | 'gitlab' | 'bitbucket' | 'slack' | 'discord' | 
           'google_calendar' | 'microsoft_calendar' | 'notion';
  providerUserId?: string;
  providerUsername?: string;
  encryptedAccessToken: Buffer;
  encryptedRefreshToken?: Buffer;
  tokenExpiresAt?: Date;
  scopes: string[];
  grantedPermissions: Record<string, any>;
  isActive: boolean;
  lastUsedAt?: Date;
  errorCount: number;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SyncConflict {
  id: string;
  userId: string;
  dataType: string;
  entityId: string;
  conflictType: 'update_conflict' | 'delete_conflict' | 'create_conflict' | 'schema_conflict';
  localVersion: Record<string, any>;
  remoteVersion: Record<string, any>;
  localTimestamp: Date;
  remoteTimestamp: Date;
  resolutionStrategy?: 'local_wins' | 'remote_wins' | 'merge' | 'manual';
  resolvedVersion?: Record<string, any>;
  resolvedAt?: Date;
  resolvedBy?: 'system' | 'user';
  createdAt: Date;
  notes?: string;
}
```

## Database Migrations

### Migration Framework
```typescript
// Migration interface
export interface Migration {
  version: string; // YYYYMMDDHHMMSS format
  name: string;
  up: (db: Database) => Promise<void>;
  down: (db: Database) => Promise<void>;
}

// Migration tracking
export interface MigrationRecord {
  version: string;
  name: string;
  appliedAt: Date;
  executionTimeMs: number;
  checksum: string;
}
```

### Sample Migrations
```sql
-- Migration 001: Initial schema
-- File: migrations/001_20240101000000_initial_schema.sql

-- Create schema_migrations table first
CREATE TABLE schema_migrations (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms INTEGER,
    checksum TEXT
);

-- Create all initial tables
-- (Include all CREATE TABLE statements from above)

-- Insert migration record
INSERT INTO schema_migrations (version, name, checksum) 
VALUES ('20240101000000', 'initial_schema', 'checksum_hash_here');

-- Migration 002: Add focus session enhancements
-- File: migrations/002_20240201000000_focus_session_enhancements.sql

-- Add new columns to focus_sessions
ALTER TABLE focus_sessions ADD COLUMN flow_confidence_score REAL 
    CHECK(flow_confidence_score >= 0 AND flow_confidence_score <= 1);
    
ALTER TABLE focus_sessions ADD COLUMN satisfaction_rating INTEGER 
    CHECK(satisfaction_rating >= 1 AND satisfaction_rating <= 5);

-- Create new index
CREATE INDEX idx_focus_sessions_satisfaction ON focus_sessions(satisfaction_rating, started_at DESC);

-- Insert migration record
INSERT INTO schema_migrations (version, name, checksum) 
VALUES ('20240201000000', 'focus_session_enhancements', 'checksum_hash_here');
```

## Performance Optimization

### Indexing Strategy
```sql
-- Critical indexes for common queries

-- 1. Time-based queries (most common)
CREATE INDEX idx_activity_logs_user_timerange ON activity_logs(user_id, started_at, ended_at);
CREATE INDEX idx_focus_sessions_user_timerange ON focus_sessions(user_id, started_at, ended_at);

-- 2. Project-based analytics
CREATE INDEX idx_activity_logs_project_duration ON activity_logs(project_id, duration_seconds DESC);
CREATE INDEX idx_activity_logs_project_type_time ON activity_logs(project_id, activity_type, started_at DESC);

-- 3. Productivity analytics
CREATE INDEX idx_activity_logs_productivity_time ON activity_logs(productivity_score DESC, started_at DESC);
CREATE INDEX idx_focus_sessions_flow_time ON focus_sessions(flow_state_achieved, flow_state_duration_minutes DESC);

-- 4. Context switching analysis
CREATE INDEX idx_context_switches_frequency ON context_switches(user_id, occurred_at, switch_reason);

-- 5. Sync operations
CREATE INDEX idx_user_data_sync_last_modified ON user_data_sync(user_id, local_updated_at DESC);
CREATE INDEX idx_sync_conflicts_resolution ON sync_conflicts(user_id, resolution_strategy, created_at);

-- 6. Composite indexes for complex queries
CREATE INDEX idx_activity_complex ON activity_logs(
    user_id, project_id, activity_type, started_at DESC
) WHERE productivity_score IS NOT NULL;
```

### Query Optimization Examples
```sql
-- Optimized daily productivity summary
WITH daily_stats AS (
    SELECT 
        date(started_at) as day,
        COUNT(*) as activity_count,
        SUM(duration_seconds) as total_seconds,
        AVG(productivity_score) as avg_productivity,
        COUNT(DISTINCT project_id) as projects_worked
    FROM activity_logs 
    WHERE user_id = ? 
        AND started_at >= date('now', '-30 days')
        AND productivity_score IS NOT NULL
    GROUP BY date(started_at)
)
SELECT 
    day,
    activity_count,
    ROUND(total_seconds / 3600.0, 2) as total_hours,
    ROUND(avg_productivity, 1) as avg_productivity,
    projects_worked
FROM daily_stats 
ORDER BY day DESC;

-- Optimized project comparison query
SELECT 
    p.name as project_name,
    COUNT(al.id) as sessions,
    SUM(al.duration_seconds) / 3600.0 as total_hours,
    AVG(al.productivity_score) as avg_productivity,
    COUNT(DISTINCT date(al.started_at)) as active_days,
    MAX(al.started_at) as last_activity
FROM projects p
LEFT JOIN activity_logs al ON p.id = al.project_id 
    AND al.started_at >= date('now', '-30 days')
WHERE p.user_id = ? AND p.is_active = 1
GROUP BY p.id, p.name
HAVING total_hours > 0
ORDER BY total_hours DESC;
```

## Data Validation and Constraints

### Database Constraints
```sql
-- Activity logs validation
ALTER TABLE activity_logs ADD CONSTRAINT check_valid_duration 
    CHECK (duration_seconds > 0 AND duration_seconds < 86400); -- Max 24 hours

ALTER TABLE activity_logs ADD CONSTRAINT check_valid_timestamps 
    CHECK (ended_at > started_at);

-- Focus sessions validation
ALTER TABLE focus_sessions ADD CONSTRAINT check_flow_duration_logical
    CHECK (flow_state_duration_minutes <= actual_duration_minutes);

ALTER TABLE focus_sessions ADD CONSTRAINT check_reasonable_duration
    CHECK (actual_duration_minutes IS NULL OR actual_duration_minutes <= 720); -- Max 12 hours

-- Context switches validation
ALTER TABLE context_switches ADD CONSTRAINT check_different_projects
    CHECK (from_project_id != to_project_id OR from_project_id IS NULL OR to_project_id IS NULL);

-- Projects validation
ALTER TABLE projects ADD CONSTRAINT check_valid_color
    CHECK (color IS NULL OR (length(color) = 7 AND color LIKE '#%'));
```

### Application-Level Validation
```typescript
// Validation schemas using Zod
import { z } from 'zod';

export const ActivityLogSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  activityType: z.enum(['coding', 'debugging', 'testing', 'building', 'researching', 'communication', 'planning', 'other']),
  durationSeconds: z.number().min(1).max(86400), // 1 second to 24 hours
  productivityScore: z.number().min(0).max(100).optional(),
  startedAt: z.date(),
  endedAt: z.date(),
  metadata: z.record(z.any()).optional()
}).refine(data => data.endedAt > data.startedAt, {
  message: "End time must be after start time"
});

export const FocusSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  sessionType: z.enum(['deep_work', 'pomodoro', 'timeboxing', 'flow', 'break']),
  plannedDurationMinutes: z.number().min(1).max(720).optional(), // 1 minute to 12 hours
  actualDurationMinutes: z.number().min(1).max(720).optional(),
  flowStateDurationMinutes: z.number().min(0),
  productivityRating: z.number().min(1).max(5).optional(),
  startedAt: z.date(),
  endedAt: z.date().optional()
}).refine(data => !data.endedAt || data.endedAt > data.startedAt, {
  message: "End time must be after start time"
}).refine(data => !data.actualDurationMinutes || data.flowStateDurationMinutes <= data.actualDurationMinutes, {
  message: "Flow state duration cannot exceed actual duration"
});
```

## Privacy and Security Implementation

### Data Encryption
```sql
-- Encryption functions for sensitive data
CREATE TABLE encryption_keys (
    user_id TEXT PRIMARY KEY,
    encrypted_key BLOB NOT NULL,
    key_salt BLOB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Views for decrypted data access
CREATE VIEW decrypted_user_settings AS
SELECT 
    id,
    user_id,
    category,
    setting_key,
    CASE 
        WHEN is_encrypted = 1 THEN '[ENCRYPTED]'
        ELSE setting_value
    END as setting_value,
    value_type,
    updated_at
FROM user_settings;
```

### Privacy Controls
```typescript
// Privacy settings interface
export interface PrivacySettings {
  enableActivityTracking: boolean;
  trackApplicationNames: boolean;
  trackWindowTitles: boolean;
  trackFilePaths: boolean;
  excludedApplications: string[];
  excludedPaths: string[];
  maxIdleTimeMinutes: number;
  autoDeleteAfterDays: number;
  allowCloudSync: boolean;
  allowIntegrations: boolean;
  anonymizeData: boolean;
}

// Data minimization function
export function minimizeActivityData(activity: ActivityLog, privacy: PrivacySettings): Partial<ActivityLog> {
  const minimized: Partial<ActivityLog> = {
    id: activity.id,
    userId: activity.userId,
    activityType: activity.activityType,
    durationSeconds: activity.durationSeconds,
    startedAt: activity.startedAt,
    endedAt: activity.endedAt
  };

  if (privacy.trackApplicationNames) {
    minimized.applicationName = activity.applicationName;
  }

  if (privacy.trackWindowTitles) {
    minimized.windowTitle = privacy.anonymizeData ? 
      anonymizeWindowTitle(activity.windowTitle) : activity.windowTitle;
  }

  if (privacy.trackFilePaths && activity.filePath && 
      !privacy.excludedPaths.some(path => activity.filePath?.includes(path))) {
    minimized.filePath = privacy.anonymizeData ? 
      anonymizeFilePath(activity.filePath) : activity.filePath;
  }

  return minimized;
}
```

## Sample Analytics Queries

### Productivity Insights
```sql
-- Weekly productivity trend
WITH weekly_productivity AS (
    SELECT 
        strftime('%Y-%W', started_at) as week,
        AVG(productivity_score) as avg_score,
        SUM(duration_seconds) / 3600.0 as total_hours,
        COUNT(DISTINCT project_id) as projects_count
    FROM activity_logs 
    WHERE user_id = ? 
        AND started_at >= date('now', '-12 weeks')
        AND productivity_score IS NOT NULL
    GROUP BY strftime('%Y-%W', started_at)
)
SELECT 
    week,
    ROUND(avg_score, 1) as productivity_score,
    ROUND(total_hours, 1) as hours_worked,
    projects_count,
    LAG(avg_score) OVER (ORDER BY week) as prev_week_score,
    ROUND(avg_score - LAG(avg_score) OVER (ORDER BY week), 1) as score_change
FROM weekly_productivity
ORDER BY week DESC;

-- Deep work analysis
SELECT 
    fs.session_type,
    COUNT(*) as session_count,
    AVG(fs.actual_duration_minutes) as avg_duration,
    SUM(CASE WHEN fs.flow_state_achieved THEN 1 ELSE 0 END) as flow_sessions,
    AVG(fs.productivity_rating) as avg_rating,
    AVG(fs.interruption_count) as avg_interruptions
FROM focus_sessions fs
WHERE fs.user_id = ? 
    AND fs.started_at >= date('now', '-30 days')
    AND fs.ended_at IS NOT NULL
GROUP BY fs.session_type
ORDER BY session_count DESC;

-- Context switching impact
SELECT 
    cs.switch_reason,
    COUNT(*) as switch_count,
    AVG(cs.productivity_impact_score) as avg_impact,
    AVG(cs.context_recovery_time_minutes) as avg_recovery_time,
    strftime('%H', cs.occurred_at) as hour_of_day
FROM context_switches cs
WHERE cs.user_id = ?
    AND cs.occurred_at >= date('now', '-7 days')
GROUP BY cs.switch_reason, strftime('%H', cs.occurred_at)
ORDER BY switch_count DESC;
```

### Time Allocation Analysis
```sql
-- Project time allocation
WITH project_stats AS (
    SELECT 
        p.name as project_name,
        p.color as project_color,
        SUM(al.duration_seconds) as total_seconds,
        COUNT(al.id) as activity_count,
        AVG(al.productivity_score) as avg_productivity,
        MAX(al.started_at) as last_activity
    FROM projects p
    LEFT JOIN activity_logs al ON p.id = al.project_id 
        AND al.started_at >= date('now', '-30 days')
    WHERE p.user_id = ? AND p.is_active = 1
    GROUP BY p.id, p.name, p.color
    HAVING total_seconds > 0
),
total_time AS (
    SELECT SUM(total_seconds) as grand_total
    FROM project_stats
)
SELECT 
    ps.project_name,
    ps.project_color,
    ROUND(ps.total_seconds / 3600.0, 2) as hours_worked,
    ROUND((ps.total_seconds * 100.0 / tt.grand_total), 1) as percentage,
    ps.activity_count,
    ROUND(ps.avg_productivity, 1) as avg_productivity,
    ps.last_activity
FROM project_stats ps
CROSS JOIN total_time tt
ORDER BY ps.total_seconds DESC;
```

## Data Retention and Archival

### Retention Policies
```sql
-- Automatic data cleanup based on retention settings
CREATE TRIGGER auto_cleanup_old_data
AFTER INSERT ON activity_logs
BEGIN
    DELETE FROM activity_logs 
    WHERE user_id = NEW.user_id 
        AND started_at < date('now', '-' || (
            SELECT COALESCE(
                (SELECT setting_value FROM user_settings 
                 WHERE user_id = NEW.user_id 
                   AND category = 'privacy' 
                   AND setting_key = 'data_retention_days'), 
                '365'
            )
        ) || ' days');
END;

-- Archive old focus sessions to separate table
CREATE TABLE focus_sessions_archive AS SELECT * FROM focus_sessions WHERE 1=0;

CREATE VIEW all_focus_sessions AS
SELECT * FROM focus_sessions
UNION ALL
SELECT * FROM focus_sessions_archive;
```

### Data Export Functions
```sql
-- Complete user data export
CREATE VIEW user_data_export AS
WITH user_summary AS (
    SELECT 
        u.id as user_id,
        u.email,
        u.created_at as account_created,
        COUNT(DISTINCT p.id) as total_projects,
        COUNT(DISTINCT al.id) as total_activities,
        COUNT(DISTINCT fs.id) as total_focus_sessions,
        SUM(al.duration_seconds) / 3600.0 as total_tracked_hours
    FROM users u
    LEFT JOIN projects p ON u.id = p.user_id
    LEFT JOIN activity_logs al ON u.id = al.user_id
    LEFT JOIN focus_sessions fs ON u.id = fs.user_id
    GROUP BY u.id, u.email, u.created_at
)
SELECT 
    us.*,
    json_object(
        'projects', (
            SELECT json_group_array(
                json_object('name', name, 'hours', 
                    COALESCE(SUM(al.duration_seconds) / 3600.0, 0)
                )
            )
            FROM projects p 
            LEFT JOIN activity_logs al ON p.id = al.project_id
            WHERE p.user_id = us.user_id 
            GROUP BY p.id, p.name
        ),
        'weekly_hours', (
            SELECT json_group_array(
                json_object('week', week, 'hours', weekly_hours)
            )
            FROM (
                SELECT 
                    strftime('%Y-%W', started_at) as week,
                    SUM(duration_seconds) / 3600.0 as weekly_hours
                FROM activity_logs 
                WHERE user_id = us.user_id 
                GROUP BY strftime('%Y-%W', started_at)
                ORDER BY week DESC
                LIMIT 12
            )
        )
    ) as analytics_summary
FROM user_summary us;
```

This comprehensive database schema provides a solid foundation for DevPulse's privacy-first productivity analytics platform, with proper relationships, performance optimizations, and privacy controls built in from the ground up.