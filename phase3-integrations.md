# Phase 3: Core Integrations (Weeks 5-6)

## Overview
Build optional cloud sync backend and integrate with external developer services to enhance productivity insights. This phase adds GitHub/GitLab commit correlation, Slack/Discord status sync, Google Calendar integration, and encrypted cloud synchronization while maintaining privacy-first principles.

## Agent Assignment
- **Primary Agent**: `backend-architect` - API design, database architecture, and integration logic
- **Supporting Agent**: `devops-automator` - Cloud infrastructure, deployment, and security

## Objectives
1. Create optional cloud sync backend with PostgreSQL for multi-device support
2. Implement encrypted data synchronization with conflict resolution
3. Build GitHub/GitLab integration for commit frequency correlation
4. Add Slack/Discord status synchronization for team visibility
5. Integrate Google Calendar for automatic focus session scheduling
6. Ensure all integrations respect privacy preferences and user consent

## Technical Requirements

### Cloud Sync Backend Architecture

#### 1. Backend Framework Stack
- **Runtime**: Node.js 20+ with Express.js
- **Language**: TypeScript with strict mode
- **Database**: PostgreSQL 16+ with Prisma ORM
- **Authentication**: JWT + OAuth2 (GitHub, Google, Slack)
- **Encryption**: AES-256-GCM for data at rest
- **Real-time**: Socket.io for live updates
- **API Documentation**: OpenAPI 3.0 with Swagger UI
- **Rate Limiting**: Express rate limit with Redis
- **Logging**: Winston with structured logging

#### 2. Database Schema (PostgreSQL)
```sql
-- Users and authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  encrypted_password VARCHAR(255),
  avatar_url VARCHAR(500),
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Encrypted user data sync
CREATE TABLE user_data_sync (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  data_type VARCHAR(50) NOT NULL, -- 'projects', 'activities', 'focus_sessions'
  encrypted_data BYTEA NOT NULL,
  checksum VARCHAR(64) NOT NULL,
  version INTEGER DEFAULT 1,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  device_id VARCHAR(100) NOT NULL,
  
  UNIQUE(user_id, data_type, device_id)
);

-- Integration tokens (encrypted)
CREATE TABLE integration_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL, -- 'github', 'gitlab', 'slack', 'discord', 'google'
  encrypted_access_token BYTEA NOT NULL,
  encrypted_refresh_token BYTEA,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  scopes TEXT[] DEFAULT '{}',
  provider_user_id VARCHAR(100),
  provider_username VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE(user_id, provider)
);

-- External service data cache
CREATE TABLE external_data_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,
  data_type VARCHAR(50) NOT NULL, -- 'commits', 'calendar_events', 'status'
  external_id VARCHAR(200) NOT NULL,
  cached_data JSONB NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(user_id, provider, data_type, external_id)
);

-- Sync conflict resolution
CREATE TABLE sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  data_type VARCHAR(50) NOT NULL,
  local_version JSONB NOT NULL,
  remote_version JSONB NOT NULL,
  conflict_type VARCHAR(50) NOT NULL, -- 'update_conflict', 'delete_conflict'
  resolution_strategy VARCHAR(50), -- 'local_wins', 'remote_wins', 'merge', 'manual'
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. API Endpoints Design
```typescript
// Authentication endpoints
interface AuthAPI {
  POST   /api/auth/register
  POST   /api/auth/login
  POST   /api/auth/logout
  POST   /api/auth/refresh
  GET    /api/auth/me
}

// Data synchronization endpoints
interface SyncAPI {
  POST   /api/sync/upload        // Upload encrypted local data
  GET    /api/sync/download      // Download user's synced data
  GET    /api/sync/conflicts     // Get unresolved conflicts
  POST   /api/sync/resolve       // Resolve sync conflicts
  DELETE /api/sync/data          // Delete user's synced data
}

// Integration management endpoints
interface IntegrationAPI {
  GET    /api/integrations                    // List user's integrations
  POST   /api/integrations/{provider}/connect // Initiate OAuth flow
  POST   /api/integrations/{provider}/disconnect
  GET    /api/integrations/{provider}/status
  POST   /api/integrations/{provider}/sync    // Manual sync trigger
}

// External data endpoints
interface ExternalDataAPI {
  GET    /api/external/commits               // GitHub/GitLab commits
  GET    /api/external/calendar              // Google Calendar events
  POST   /api/external/status                // Update Slack/Discord status
  GET    /api/external/repositories          // User's repositories
}
```

### Integration Implementations

#### 1. GitHub/GitLab Integration
```typescript
interface GitIntegration {
  // OAuth setup and token management
  initiateOAuth(provider: 'github' | 'gitlab'): Promise<string>;
  exchangeCodeForTokens(code: string, provider: string): Promise<TokenSet>;
  
  // Repository and commit data
  getUserRepositories(userId: string): Promise<Repository[]>;
  getCommitHistory(repoId: string, since: Date): Promise<Commit[]>;
  correlateCommitsWithActivity(userId: string, timeRange: TimeRange): Promise<CommitCorrelation[]>;
}

interface Commit {
  id: string;
  repository: string;
  message: string;
  author: string;
  timestamp: Date;
  additions: number;
  deletions: number;
  files: string[];
}

interface CommitCorrelation {
  activityPeriod: {
    startTime: Date;
    endTime: Date;
    duration: number;
    projectPath: string;
  };
  relatedCommits: Commit[];
  correlationScore: number; // 0-1 confidence in correlation
}
```

**Implementation Tasks for `backend-architect`:**
- Set up GitHub/GitLab OAuth2 applications
- Implement secure token storage with encryption
- Build commit fetching with pagination and rate limiting
- Create correlation algorithm matching commits to activity periods
- Add webhook support for real-time commit notifications
- Implement repository permission checking

#### 2. Slack/Discord Status Integration
```typescript
interface StatusIntegration {
  updateStatus(userId: string, status: DeveloperStatus): Promise<void>;
  scheduleStatusUpdate(userId: string, status: DeveloperStatus, duration: number): Promise<void>;
  clearStatus(userId: string): Promise<void>;
}

interface DeveloperStatus {
  emoji: string;
  text: string;
  expiration?: Date;
  projectContext?: string;
}

// Status templates
const statusTemplates = {
  coding: {
    slack: { emoji: ':computer:', text: 'Coding' },
    discord: { emoji: '💻', text: 'Coding' }
  },
  focus: {
    slack: { emoji: ':dart:', text: 'In focus mode' },
    discord: { emoji: '🎯', text: 'In focus mode' }
  },
  debugging: {
    slack: { emoji: ':bug:', text: 'Debugging' },
    discord: { emoji: '🐛', text: 'Debugging' }
  },
  meeting: {
    slack: { emoji: ':speech_balloon:', text: 'In meeting' },
    discord: { emoji: '💬', text: 'In meeting' }
  }
};
```

**Implementation Tasks for `backend-architect`:**
- Set up Slack and Discord bot applications
- Implement status update APIs for both platforms
- Create smart status templates based on activity type
- Add automatic status clearing when activity stops
- Build status scheduling for focus sessions
- Handle API rate limits and error recovery

#### 3. Google Calendar Integration
```typescript
interface CalendarIntegration {
  // OAuth and calendar access
  getCalendarList(userId: string): Promise<Calendar[]>;
  getEvents(userId: string, calendarId: string, timeRange: TimeRange): Promise<CalendarEvent[]>;
  
  // Focus session scheduling
  createFocusBlock(userId: string, focusSession: FocusSessionRequest): Promise<CalendarEvent>;
  updateFocusBlock(eventId: string, updates: Partial<FocusSessionRequest>): Promise<void>;
  deleteFocusBlock(eventId: string): Promise<void>;
  
  // Smart suggestions
  suggestFocusTimeSlots(userId: string, preferences: FocusPreferences): Promise<TimeSlot[]>;
}

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendees?: string[];
  isAllDay: boolean;
  recurringEventId?: string;
}

interface FocusSessionRequest {
  title: string;
  projectId?: string;
  duration: number; // minutes
  startTime: Date;
  description?: string;
  notifications: number[]; // minutes before event
}

interface TimeSlot {
  startTime: Date;
  endTime: Date;
  duration: number;
  confidence: number; // 0-1 score based on historical productivity
  conflictCount: number;
}
```

**Implementation Tasks for `backend-architect`:**
- Set up Google Calendar API OAuth2 integration
- Implement calendar event CRUD operations
- Build intelligent time slot suggestion algorithm
- Add conflict detection with existing calendar events
- Create focus session templates and recurring sessions
- Implement calendar webhook notifications for real-time updates

### Data Synchronization Architecture

#### 1. Encryption and Security
```typescript
interface EncryptionService {
  // User-specific encryption keys derived from password
  deriveUserKey(userId: string, password: string): Promise<CryptoKey>;
  
  // Data encryption/decryption
  encryptData(data: any, key: CryptoKey): Promise<EncryptedData>;
  decryptData(encryptedData: EncryptedData, key: CryptoKey): Promise<any>;
  
  // Integrity verification
  generateChecksum(data: any): string;
  verifyChecksum(data: any, checksum: string): boolean;
}

interface EncryptedData {
  encryptedContent: Buffer;
  iv: Buffer; // Initialization vector
  authTag: Buffer; // Authentication tag
  algorithm: string; // 'aes-256-gcm'
}
```

**Security Implementation for `devops-automator`:**
- Implement client-side encryption before upload
- Use user-derived keys (never stored on server)
- Add data integrity verification with checksums
- Implement secure key derivation with PBKDF2
- Add rate limiting and DDoS protection
- Set up SSL/TLS with proper certificate management

#### 2. Conflict Resolution System
```typescript
interface ConflictResolver {
  detectConflicts(localData: any, remoteData: any): ConflictType[];
  resolveConflict(conflict: SyncConflict, strategy: ResolutionStrategy): Promise<any>;
  mergeData(localData: any, remoteData: any, mergeRules: MergeRules): Promise<any>;
}

enum ConflictType {
  UPDATE_CONFLICT = 'update_conflict',    // Same record updated on both sides
  DELETE_CONFLICT = 'delete_conflict',    // Record deleted locally but updated remotely
  SCHEMA_CONFLICT = 'schema_conflict'     // Different data structures
}

enum ResolutionStrategy {
  LOCAL_WINS = 'local_wins',
  REMOTE_WINS = 'remote_wins',
  MERGE = 'merge',
  MANUAL = 'manual'
}
```

**Implementation Tasks for `backend-architect`:**
- Build three-way merge algorithm for data conflicts
- Implement automatic conflict detection
- Create user interface for manual conflict resolution
- Add conflict history and rollback capability
- Design merge rules for different data types
- Implement conflict notification system

### Real-Time Integration Pipeline

#### 1. WebSocket Connection Management
```typescript
interface WebSocketManager {
  // Connection lifecycle
  handleConnection(socket: Socket, userId: string): void;
  handleDisconnection(socket: Socket): void;
  
  // Real-time updates
  broadcastToUser(userId: string, event: string, data: any): void;
  broadcastIntegrationUpdate(userId: string, provider: string, data: any): void;
  
  // Integration-specific events
  handleCommitNotification(webhookData: GitWebhook): void;
  handleCalendarUpdate(webhookData: CalendarWebhook): void;
  handleStatusUpdate(userId: string, status: DeveloperStatus): void;
}

// Real-time event types
interface IntegrationEvents {
  'commit:new': Commit;
  'calendar:event_updated': CalendarEvent;
  'status:updated': DeveloperStatus;
  'sync:conflict': SyncConflict;
  'integration:connected': IntegrationStatus;
  'integration:error': IntegrationError;
}
```

#### 2. Background Job Processing
```typescript
interface BackgroundJobs {
  // Data synchronization jobs
  'sync:upload': (userId: string, dataType: string) => Promise<void>;
  'sync:download': (userId: string) => Promise<void>;
  
  // Integration sync jobs
  'integration:github:sync': (userId: string) => Promise<void>;
  'integration:calendar:sync': (userId: string) => Promise<void>;
  
  // Maintenance jobs
  'cleanup:expired_tokens': () => Promise<void>;
  'cleanup:old_cache': () => Promise<void>;
}
```

**Implementation Tasks for `devops-automator`:**
- Set up Redis for job queue and session storage
- Implement background job processor with Bull Queue
- Create webhook endpoints for external service notifications
- Set up monitoring and alerting for job failures
- Implement retry logic and dead letter queues
- Add job scheduling for periodic sync operations

### Privacy and Consent Management

#### 1. Granular Privacy Controls
```typescript
interface PrivacySettings {
  // Data sync preferences
  enableCloudSync: boolean;
  syncActivities: boolean;
  syncProjects: boolean;
  syncFocusSessions: boolean;
  
  // Integration preferences
  integrations: {
    [provider: string]: {
      enabled: boolean;
      permissions: string[];
      autoSync: boolean;
      retentionDays: number;
    };
  };
  
  // Data retention
  retentionPolicy: {
    localRetentionDays: number;
    cloudRetentionDays: number;
    autoDeleteAfterInactivity: boolean;
  };
}
```

#### 2. GDPR Compliance Features
```typescript
interface GDPRCompliance {
  // User rights implementation
  exportUserData(userId: string, format: 'json' | 'csv'): Promise<Buffer>;
  deleteAllUserData(userId: string): Promise<void>;
  anonymizeUserData(userId: string): Promise<void>;
  
  // Consent management
  recordConsent(userId: string, consentType: string, granted: boolean): Promise<void>;
  getConsentHistory(userId: string): Promise<ConsentRecord[]>;
  
  // Data processing logs
  logDataProcessing(userId: string, operation: string, purpose: string): Promise<void>;
}
```

### Infrastructure and Deployment

#### 1. Cloud Architecture (AWS)
```yaml
# docker-compose.yml for development
version: '3.8'
services:
  api:
    build: ./apps/sync-backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://user:pass@postgres:5432/devpulse
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
      
  postgres:
    image: postgres:16
    environment:
      - POSTGRES_DB=devpulse
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
      
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
```

**Infrastructure Tasks for `devops-automator`:**
- Set up AWS ECS cluster for container orchestration
- Configure RDS PostgreSQL with encryption at rest
- Set up ElastiCache Redis for sessions and job queue
- Implement AWS ALB with SSL termination
- Configure CloudWatch logging and monitoring
- Set up auto-scaling policies for ECS services

#### 2. CI/CD Pipeline
```yaml
# .github/workflows/deploy-backend.yml
name: Deploy Backend
on:
  push:
    branches: [main]
    paths: ['apps/sync-backend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run test
      - run: npm run test:integration
      
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: task-definition.json
          service: devpulse-backend
          cluster: devpulse-cluster
```

### Testing Strategy

#### 1. Integration Tests
```typescript
describe('GitHub Integration', () => {
  it('should correlate commits with activity periods', async () => {
    const userId = 'test-user-id';
    const mockCommits = createMockCommits();
    const mockActivities = createMockActivities();
    
    // Mock GitHub API responses
    nock('https://api.github.com')
      .get(/\/repos\/.*\/commits/)
      .reply(200, mockCommits);
    
    const correlations = await githubIntegration.correlateCommitsWithActivity(
      userId, 
      { start: yesterday, end: today }
    );
    
    expect(correlations).toHaveLength(3);
    expect(correlations[0].correlationScore).toBeGreaterThan(0.8);
  });
});
```

#### 2. End-to-End Integration Tests
- OAuth flow completion for all providers
- Data sync with conflict resolution scenarios
- Real-time update propagation
- Webhook processing and error handling

### Deliverables for Phase 3

#### Week 5 Deliverables
1. **Cloud sync backend** with PostgreSQL database and user authentication
2. **GitHub/GitLab integration** with OAuth2 setup and commit correlation
3. **Data encryption and sync** infrastructure with conflict detection
4. **Real-time WebSocket** setup for live integration updates
5. **Basic deployment** pipeline with Docker containerization

#### Week 6 Deliverables
1. **Slack/Discord status integration** with automatic status updates
2. **Google Calendar integration** with focus session scheduling
3. **Complete privacy controls** with GDPR compliance features
4. **Production deployment** on AWS with monitoring and scaling
5. **Integration testing** and security audit

### Success Criteria
- ✅ All integrations work reliably with proper error handling
- ✅ Data sync maintains integrity across multiple devices
- ✅ OAuth flows complete successfully for all supported services
- ✅ Real-time updates propagate within 2 seconds
- ✅ Backend handles 1000+ concurrent connections
- ✅ All user data properly encrypted at rest and in transit
- ✅ GDPR compliance with complete data export/deletion

### Integration with Previous Phases
Phase 3 builds upon and enhances Phases 1 and 2:
- **Desktop App**: Adds cloud sync capabilities and integration settings
- **Dashboard**: Displays integrated data (commits, calendar events, status updates)
- **Privacy**: Extends privacy controls to cover all integrations
- **Real-time**: Enhances real-time capabilities with external data streams

### Handoff to Phase 4
Phase 3 provides the data foundation for advanced analytics in Phase 4:
- **Rich Dataset**: Combined local activity data with external service data
- **Real-time Pipeline**: Infrastructure for real-time AI analysis
- **Integration APIs**: Data sources for correlation and pattern analysis
- **Cloud Infrastructure**: Scalable platform for AI/ML workloads
- **Privacy Framework**: Compliant foundation for AI processing