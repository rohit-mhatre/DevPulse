// GitHub Integration Types for DevPulse

export interface GitHubSettings {
  id: string;
  userId: string;
  username?: string;
  accessToken?: string; // Will be encrypted in production
  refreshToken?: string; // Will be encrypted in production
  tokenExpiresAt?: Date;
  lastSyncAt?: Date;
  syncEnabled: boolean;
  syncFrequencyMinutes: number;
  privateReposEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface GitHubRepository {
  id: string;
  userId: string;
  githubId: number;
  name: string;
  fullName: string;
  description?: string;
  language?: string;
  isPrivate: boolean;
  isFork: boolean;
  starsCount: number;
  forksCount: number;
  defaultBranch: string;
  cloneUrl?: string;
  sshUrl?: string;
  homepageUrl?: string;
  archived: boolean;
  disabled: boolean;
  lastPushAt?: Date;
  lastUpdatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface GitHubCommit {
  id: string;
  userId: string;
  repositoryId: string;
  sha: string;
  message: string;
  authorName?: string;
  authorEmail?: string;
  authorDate: Date;
  committerName?: string;
  committerEmail?: string;
  committerDate: Date;
  treeSha?: string;
  parentShas: string[]; // Array of parent commit SHAs
  additions: number;
  deletions: number;
  changedFiles: number;
  branchName?: string;
  isMerge: boolean;
  isMainBranch: boolean;
  linkedActivityLogId?: string;
  confidenceScore?: number; // 0-1, correlation confidence with activity logs
  createdAt: Date;
}

export interface GitHubPullRequest {
  id: string;
  userId: string;
  repositoryId: string;
  githubId: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed' | 'merged';
  isDraft: boolean;
  authorLogin?: string;
  authorId?: number;
  assignees: string[]; // Array of assignee logins
  requestedReviewers: string[]; // Array of reviewer logins
  createdAtGithub: Date;
  updatedAtGithub: Date;
  closedAt?: Date;
  mergedAt?: Date;
  headBranch?: string;
  headSha?: string;
  baseBranch?: string;
  baseSha?: string;
  additions: number;
  deletions: number;
  changedFiles: number;
  commitsCount: number;
  commentsCount: number;
  reviewCommentsCount: number;
  mergedByLogin?: string;
  mergeCommitSha?: string;
  linkedFocusSessionId?: string;
  estimatedWorkHours?: number;
  productivityImpactScore?: number; // 0-100
  createdAt: Date;
  updatedAt: Date;
}

export interface GitHubIssue {
  id: string;
  userId: string;
  repositoryId: string;
  githubId: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  authorLogin?: string;
  authorId?: number;
  assignees: string[]; // Array of assignee logins
  labels: string[]; // Array of label names
  milestoneTitle?: string;
  createdAtGithub: Date;
  updatedAtGithub: Date;
  closedAt?: Date;
  commentsCount: number;
  estimatedComplexity?: 'low' | 'medium' | 'high';
  resolutionTimeHours?: number;
  linkedActivityLogs: string[]; // Array of activity log IDs
  createdAt: Date;
  updatedAt: Date;
}

export interface GitHubStreak {
  id: string;
  userId: string;
  streakDate: Date;
  commitsCount: number;
  pullRequestsCount: number;
  issuesClosedCount: number;
  repositoriesWorked: number;
  linesAdded: number;
  linesDeleted: number;
  activityScore: number;
  consistencyBonus: number;
  createdAt: Date;
}

export interface GitHubLanguageStats {
  id: string;
  userId: string;
  language: string;
  periodStart: Date;
  periodEnd: Date;
  repositoriesCount: number;
  commitsCount: number;
  linesAdded: number;
  linesDeleted: number;
  correlatedCodingTimeSeconds: number;
  productivityScore?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GitHubSyncLog {
  id: string;
  userId: string;
  syncType: 'full' | 'incremental' | 'manual';
  status: 'started' | 'in_progress' | 'completed' | 'failed';
  repositoriesSynced: number;
  commitsSynced: number;
  pullRequestsSynced: number;
  issuesSynced: number;
  errorMessage?: string;
  errorCount: number;
  apiCallsMade: number;
  rateLimitRemaining?: number;
  rateLimitResetAt?: Date;
  startedAt: Date;
  completedAt?: Date;
  durationSeconds?: number;
  createdAt: Date;
}

// GitHub API Response Types
export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name?: string;
  email?: string;
  bio?: string;
  company?: string;
  location?: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description?: string;
  private: boolean;
  fork: boolean;
  language?: string;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  clone_url: string;
  ssh_url: string;
  homepage?: string;
  archived: boolean;
  disabled: boolean;
  pushed_at?: string;
  updated_at: string;
  created_at: string;
}

export interface GitHubCommitResponse {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
    committer: {
      name: string;
      email: string;
      date: string;
    };
    tree: {
      sha: string;
    };
  };
  parents: Array<{ sha: string }>;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
  files?: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
  }>;
}

export interface GitHubPullRequestResponse {
  id: number;
  number: number;
  title: string;
  body?: string;
  state: 'open' | 'closed';
  draft: boolean;
  user: {
    login: string;
    id: number;
  };
  assignees: Array<{
    login: string;
    id: number;
  }>;
  requested_reviewers: Array<{
    login: string;
    id: number;
  }>;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  merged_at?: string;
  head: {
    ref: string;
    sha: string;
  };
  base: {
    ref: string;
    sha: string;
  };
  additions: number;
  deletions: number;
  changed_files: number;
  commits: number;
  comments: number;
  review_comments: number;
  merged_by?: {
    login: string;
  };
  merge_commit_sha?: string;
}

// Configuration and Settings Types
export interface GitHubIntegrationConfig {
  enabled: boolean;
  syncFrequency: number; // minutes
  includePrivateRepos: boolean;
  repositoryFilters: string[]; // Repository names to include/exclude
  branchFilters: string[]; // Branch names to include/exclude
  enableAutomaticCorrelation: boolean;
  correlationThreshold: number; // 0-1
  maxDaysToSync: number;
  enableWebhooks: boolean;
}

export interface GitHubOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

// Analytics and Dashboard Types
export interface GitHubProductivityMetrics {
  totalCommits: number;
  totalPullRequests: number;
  mergedPullRequests: number;
  totalIssues: number;
  closedIssues: number;
  linesAdded: number;
  linesDeleted: number;
  repositoriesWorked: number;
  languagesUsed: string[];
  averageCommitsPerDay: number;
  longestStreak: number;
  currentStreak: number;
  productivityScore: number;
  codeQualityScore: number;
  collaborationScore: number;
}

export interface GitHubActivityWidget {
  todayCommits: number;
  weekCommits: number;
  todayPullRequests: number;
  weekPullRequests: number;
  recentRepositories: string[];
  topLanguages: Array<{
    name: string;
    percentage: number;
    commits: number;
  }>;
  streakInfo: {
    current: number;
    longest: number;
    lastActivity: Date;
  };
}

export interface GitHubContributionCalendar {
  date: Date;
  commits: number;
  pullRequests: number;
  issuesClosed: number;
  activityLevel: 0 | 1 | 2 | 3 | 4; // 0 = no activity, 4 = very high activity
  contributionScore: number;
}

export interface GitHubCorrelationData {
  activityLogId: string;
  commitSha?: string;
  pullRequestId?: string;
  confidence: number;
  timeCorrelation: number; // How closely the times match
  projectCorrelation: number; // How closely the projects match
  activityTypeCorrelation: number; // How closely the activity types match
}

// Error and Sync Status Types
export interface GitHubSyncStatus {
  isActive: boolean;
  lastSync: Date | null;
  nextSync: Date | null;
  status: 'idle' | 'syncing' | 'error' | 'rate_limited';
  progress?: {
    current: number;
    total: number;
    stage: string;
  };
  errors: string[];
  apiCallsRemaining: number;
  rateLimitResetAt: Date | null;
}

export interface GitHubAPIError {
  message: string;
  status: number;
  headers?: Record<string, string>;
  rateLimitInfo?: {
    limit: number;
    remaining: number;
    reset: Date;
  };
}

// Settings and Preferences Types
export interface GitHubPrivacySettings {
  hidePrivateRepos: boolean;
  hideCommitMessages: boolean;
  hideFileNames: boolean;
  anonymizeUserData: boolean;
  excludeRepositories: string[];
  excludeBranches: string[];
  dataRetentionDays: number;
}

export interface GitHubNotificationSettings {
  syncComplete: boolean;
  syncErrors: boolean;
  newPullRequestMerged: boolean;
  streakMilestones: boolean;
  weeklyReport: boolean;
  rateLimitWarnings: boolean;
}

// Utility Types
export type GitHubSyncFrequency = 15 | 30 | 60 | 120 | 240 | 480 | 1440; // minutes

export type GitHubRepositorySort = 'updated' | 'created' | 'pushed' | 'full_name';

export type GitHubActivityType = 'commits' | 'pull_requests' | 'issues' | 'releases';

export type GitHubTimeRange = '24h' | '7d' | '30d' | '90d' | '1y' | 'all';

// Export all types for easy importing
export type {
  GitHubSettings,
  GitHubRepository,
  GitHubCommit,
  GitHubPullRequest,
  GitHubIssue,
  GitHubStreak,
  GitHubLanguageStats,
  GitHubSyncLog,
  GitHubUser,
  GitHubRepo,
  GitHubCommitResponse,
  GitHubPullRequestResponse,
  GitHubIntegrationConfig,
  GitHubOAuthConfig,
  GitHubProductivityMetrics,
  GitHubActivityWidget,
  GitHubContributionCalendar,
  GitHubCorrelationData,
  GitHubSyncStatus,
  GitHubAPIError,
  GitHubPrivacySettings,
  GitHubNotificationSettings
};