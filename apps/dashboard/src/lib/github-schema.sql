-- GitHub Integration Schema Extensions for DevPulse
-- This file extends the existing DevPulse database schema with GitHub activity tracking

-- GitHub settings table for storing user configuration
CREATE TABLE IF NOT EXISTS github_settings (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL DEFAULT 'default',
    username TEXT,
    access_token TEXT, -- Encrypted in production
    refresh_token TEXT, -- Encrypted in production
    token_expires_at TIMESTAMP,
    last_sync_at TIMESTAMP,
    sync_enabled BOOLEAN DEFAULT 1,
    sync_frequency_minutes INTEGER DEFAULT 60,
    private_repos_enabled BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- GitHub repositories table
CREATE TABLE IF NOT EXISTS github_repositories (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL DEFAULT 'default',
    github_id INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    description TEXT,
    language TEXT,
    is_private BOOLEAN DEFAULT 0,
    is_fork BOOLEAN DEFAULT 0,
    stars_count INTEGER DEFAULT 0,
    forks_count INTEGER DEFAULT 0,
    default_branch TEXT DEFAULT 'main',
    clone_url TEXT,
    ssh_url TEXT,
    homepage_url TEXT,
    archived BOOLEAN DEFAULT 0,
    disabled BOOLEAN DEFAULT 0,
    last_push_at TIMESTAMP,
    last_updated_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- GitHub commits table
CREATE TABLE IF NOT EXISTS github_commits (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL DEFAULT 'default',
    repository_id TEXT NOT NULL,
    sha TEXT UNIQUE NOT NULL,
    message TEXT NOT NULL,
    author_name TEXT,
    author_email TEXT,
    author_date TIMESTAMP NOT NULL,
    committer_name TEXT,
    committer_email TEXT,
    committer_date TIMESTAMP NOT NULL,
    tree_sha TEXT,
    parent_shas TEXT, -- JSON array of parent commit SHAs
    
    -- File change statistics
    additions INTEGER DEFAULT 0,
    deletions INTEGER DEFAULT 0,
    changed_files INTEGER DEFAULT 0,
    
    -- Git analysis
    branch_name TEXT,
    is_merge BOOLEAN DEFAULT 0,
    is_main_branch BOOLEAN DEFAULT 0,
    
    -- DevPulse correlation
    linked_activity_log_id TEXT,
    confidence_score REAL CHECK(confidence_score >= 0 AND confidence_score <= 1),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (repository_id) REFERENCES github_repositories(id) ON DELETE CASCADE,
    FOREIGN KEY (linked_activity_log_id) REFERENCES activity_logs(id) ON DELETE SET NULL
);

-- GitHub pull requests table
CREATE TABLE IF NOT EXISTS github_pull_requests (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL DEFAULT 'default',
    repository_id TEXT NOT NULL,
    github_id INTEGER NOT NULL,
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    state TEXT CHECK(state IN ('open', 'closed', 'merged')) NOT NULL,
    is_draft BOOLEAN DEFAULT 0,
    
    -- Author information
    author_login TEXT,
    author_id INTEGER,
    
    -- Assignees and reviewers
    assignees TEXT, -- JSON array of assignee logins
    requested_reviewers TEXT, -- JSON array of reviewer logins
    
    -- Timestamps
    created_at_github TIMESTAMP NOT NULL,
    updated_at_github TIMESTAMP NOT NULL,
    closed_at TIMESTAMP,
    merged_at TIMESTAMP,
    
    -- Branch information
    head_branch TEXT,
    head_sha TEXT,
    base_branch TEXT,
    base_sha TEXT,
    
    -- Statistics
    additions INTEGER DEFAULT 0,
    deletions INTEGER DEFAULT 0,
    changed_files INTEGER DEFAULT 0,
    commits_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    review_comments_count INTEGER DEFAULT 0,
    
    -- Merge information
    merged_by_login TEXT,
    merge_commit_sha TEXT,
    
    -- DevPulse correlation
    linked_focus_session_id TEXT,
    estimated_work_hours REAL,
    productivity_impact_score REAL CHECK(productivity_impact_score >= 0 AND productivity_impact_score <= 100),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (repository_id) REFERENCES github_repositories(id) ON DELETE CASCADE,
    FOREIGN KEY (linked_focus_session_id) REFERENCES focus_sessions(id) ON DELETE SET NULL,
    
    UNIQUE(repository_id, github_id)
);

-- GitHub issues table (for tracking issue resolution productivity)
CREATE TABLE IF NOT EXISTS github_issues (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL DEFAULT 'default',
    repository_id TEXT NOT NULL,
    github_id INTEGER NOT NULL,
    number INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    state TEXT CHECK(state IN ('open', 'closed')) NOT NULL,
    
    -- Author and assignee information
    author_login TEXT,
    author_id INTEGER,
    assignees TEXT, -- JSON array of assignee logins
    
    -- Labels and milestones
    labels TEXT, -- JSON array of label names
    milestone_title TEXT,
    
    -- Timestamps
    created_at_github TIMESTAMP NOT NULL,
    updated_at_github TIMESTAMP NOT NULL,
    closed_at TIMESTAMP,
    
    -- Statistics
    comments_count INTEGER DEFAULT 0,
    
    -- DevPulse correlation
    estimated_complexity TEXT CHECK(estimated_complexity IN ('low', 'medium', 'high')),
    resolution_time_hours REAL,
    linked_activity_logs TEXT, -- JSON array of activity log IDs
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (repository_id) REFERENCES github_repositories(id) ON DELETE CASCADE,
    
    UNIQUE(repository_id, github_id)
);

-- GitHub activity streaks tracking
CREATE TABLE IF NOT EXISTS github_streaks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL DEFAULT 'default',
    streak_date DATE NOT NULL,
    commits_count INTEGER DEFAULT 0,
    pull_requests_count INTEGER DEFAULT 0,
    issues_closed_count INTEGER DEFAULT 0,
    repositories_worked INTEGER DEFAULT 0,
    lines_added INTEGER DEFAULT 0,
    lines_deleted INTEGER DEFAULT 0,
    
    -- Calculated metrics
    activity_score REAL DEFAULT 0,
    consistency_bonus REAL DEFAULT 0,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE(user_id, streak_date)
);

-- GitHub language statistics (derived from repositories and commits)
CREATE TABLE IF NOT EXISTS github_language_stats (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL DEFAULT 'default',
    language TEXT NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Statistics
    repositories_count INTEGER DEFAULT 0,
    commits_count INTEGER DEFAULT 0,
    lines_added INTEGER DEFAULT 0,
    lines_deleted INTEGER DEFAULT 0,
    
    -- Time correlation with DevPulse activities
    correlated_coding_time_seconds INTEGER DEFAULT 0,
    productivity_score REAL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE(user_id, language, period_start, period_end)
);

-- GitHub sync log for tracking synchronization operations
CREATE TABLE IF NOT EXISTS github_sync_log (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    user_id TEXT NOT NULL DEFAULT 'default',
    sync_type TEXT CHECK(sync_type IN ('full', 'incremental', 'manual')) NOT NULL,
    status TEXT CHECK(status IN ('started', 'in_progress', 'completed', 'failed')) NOT NULL,
    
    -- Sync metrics
    repositories_synced INTEGER DEFAULT 0,
    commits_synced INTEGER DEFAULT 0,
    pull_requests_synced INTEGER DEFAULT 0,
    issues_synced INTEGER DEFAULT 0,
    
    -- Error handling
    error_message TEXT,
    error_count INTEGER DEFAULT 0,
    
    -- API usage tracking
    api_calls_made INTEGER DEFAULT 0,
    rate_limit_remaining INTEGER,
    rate_limit_reset_at TIMESTAMP,
    
    -- Time tracking
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for optimal query performance

-- GitHub settings indexes
CREATE INDEX IF NOT EXISTS idx_github_settings_user ON github_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_github_settings_sync_enabled ON github_settings(sync_enabled, last_sync_at);

-- GitHub repositories indexes
CREATE INDEX IF NOT EXISTS idx_github_repositories_user ON github_repositories(user_id, last_updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_github_repositories_language ON github_repositories(language, user_id);
CREATE INDEX IF NOT EXISTS idx_github_repositories_activity ON github_repositories(last_push_at DESC);

-- GitHub commits indexes
CREATE INDEX IF NOT EXISTS idx_github_commits_user_date ON github_commits(user_id, author_date DESC);
CREATE INDEX IF NOT EXISTS idx_github_commits_repository ON github_commits(repository_id, author_date DESC);
CREATE INDEX IF NOT EXISTS idx_github_commits_branch ON github_commits(repository_id, branch_name, author_date DESC);
CREATE INDEX IF NOT EXISTS idx_github_commits_sha ON github_commits(sha);
CREATE INDEX IF NOT EXISTS idx_github_commits_linked_activity ON github_commits(linked_activity_log_id);

-- GitHub pull requests indexes
CREATE INDEX IF NOT EXISTS idx_github_prs_user_date ON github_pull_requests(user_id, created_at_github DESC);
CREATE INDEX IF NOT EXISTS idx_github_prs_repository ON github_pull_requests(repository_id, state, created_at_github DESC);
CREATE INDEX IF NOT EXISTS idx_github_prs_state ON github_pull_requests(state, created_at_github DESC);
CREATE INDEX IF NOT EXISTS idx_github_prs_linked_session ON github_pull_requests(linked_focus_session_id);

-- GitHub issues indexes
CREATE INDEX IF NOT EXISTS idx_github_issues_user_date ON github_issues(user_id, created_at_github DESC);
CREATE INDEX IF NOT EXISTS idx_github_issues_repository ON github_issues(repository_id, state, created_at_github DESC);
CREATE INDEX IF NOT EXISTS idx_github_issues_assignee ON github_issues(assignees, state);

-- GitHub streaks indexes
CREATE INDEX IF NOT EXISTS idx_github_streaks_user_date ON github_streaks(user_id, streak_date DESC);
CREATE INDEX IF NOT EXISTS idx_github_streaks_score ON github_streaks(activity_score DESC, streak_date DESC);

-- GitHub language stats indexes
CREATE INDEX IF NOT EXISTS idx_github_language_stats_user_period ON github_language_stats(user_id, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_github_language_stats_language ON github_language_stats(language, period_end DESC);

-- GitHub sync log indexes
CREATE INDEX IF NOT EXISTS idx_github_sync_log_user_date ON github_sync_log(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_github_sync_log_status ON github_sync_log(status, started_at DESC);

-- Triggers for automatic timestamp updates

-- GitHub repositories updated_at trigger
CREATE TRIGGER IF NOT EXISTS github_repositories_updated_at 
    AFTER UPDATE ON github_repositories
BEGIN
    UPDATE github_repositories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- GitHub pull requests updated_at trigger
CREATE TRIGGER IF NOT EXISTS github_pull_requests_updated_at 
    AFTER UPDATE ON github_pull_requests
BEGIN
    UPDATE github_pull_requests SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- GitHub issues updated_at trigger
CREATE TRIGGER IF NOT EXISTS github_issues_updated_at 
    AFTER UPDATE ON github_issues
BEGIN
    UPDATE github_issues SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- GitHub settings updated_at trigger
CREATE TRIGGER IF NOT EXISTS github_settings_updated_at 
    AFTER UPDATE ON github_settings
BEGIN
    UPDATE github_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- GitHub language stats updated_at trigger
CREATE TRIGGER IF NOT EXISTS github_language_stats_updated_at 
    AFTER UPDATE ON github_language_stats
BEGIN
    UPDATE github_language_stats SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Views for common analytics queries

-- GitHub productivity overview view
CREATE VIEW IF NOT EXISTS github_productivity_overview AS
SELECT 
    gs.user_id,
    gs.username,
    COUNT(DISTINCT gr.id) as total_repositories,
    COUNT(DISTINCT CASE WHEN gr.language IS NOT NULL THEN gr.language END) as languages_used,
    COUNT(gc.id) as total_commits,
    COUNT(gpr.id) as total_pull_requests,
    COUNT(CASE WHEN gpr.state = 'merged' THEN gpr.id END) as merged_pull_requests,
    COUNT(gi.id) as total_issues,
    COUNT(CASE WHEN gi.state = 'closed' THEN gi.id END) as closed_issues,
    COALESCE(SUM(gc.additions), 0) as total_lines_added,
    COALESCE(SUM(gc.deletions), 0) as total_lines_deleted,
    COALESCE(MAX(gc.author_date), MAX(gpr.created_at_github)) as last_activity_date,
    gs.last_sync_at
FROM github_settings gs
LEFT JOIN github_repositories gr ON gs.user_id = gr.user_id
LEFT JOIN github_commits gc ON gr.id = gc.repository_id
LEFT JOIN github_pull_requests gpr ON gr.id = gpr.repository_id
LEFT JOIN github_issues gi ON gr.id = gi.repository_id
GROUP BY gs.user_id, gs.username, gs.last_sync_at;

-- Daily GitHub activity view
CREATE VIEW IF NOT EXISTS github_daily_activity AS
SELECT 
    gc.user_id,
    DATE(gc.author_date) as activity_date,
    COUNT(DISTINCT gc.repository_id) as repositories_worked,
    COUNT(gc.id) as commits_made,
    SUM(gc.additions) as lines_added,
    SUM(gc.deletions) as lines_deleted,
    SUM(gc.changed_files) as files_changed,
    COUNT(DISTINCT CASE 
        WHEN gpr.created_at_github >= DATE(gc.author_date) 
         AND gpr.created_at_github < DATE(gc.author_date, '+1 day')
        THEN gpr.id 
    END) as pull_requests_created,
    AVG(CASE WHEN gc.confidence_score IS NOT NULL THEN gc.confidence_score END) as avg_correlation_confidence
FROM github_commits gc
LEFT JOIN github_pull_requests gpr ON gc.repository_id = gpr.repository_id
GROUP BY gc.user_id, DATE(gc.author_date)
ORDER BY activity_date DESC;

-- GitHub streak calculation view
CREATE VIEW IF NOT EXISTS github_streak_calculation AS
WITH daily_activity AS (
    SELECT 
        user_id,
        streak_date,
        CASE WHEN commits_count > 0 OR pull_requests_count > 0 OR issues_closed_count > 0 
             THEN 1 ELSE 0 END as has_activity
    FROM github_streaks
    ORDER BY user_id, streak_date
),
streak_groups AS (
    SELECT *,
        SUM(CASE WHEN has_activity = 0 THEN 1 ELSE 0 END) 
        OVER (PARTITION BY user_id ORDER BY streak_date ROWS UNBOUNDED PRECEDING) as streak_group
    FROM daily_activity
)
SELECT 
    user_id,
    streak_group,
    MIN(streak_date) as streak_start,
    MAX(streak_date) as streak_end,
    COUNT(*) as streak_length,
    SUM(has_activity) as active_days
FROM streak_groups
WHERE has_activity = 1
GROUP BY user_id, streak_group
ORDER BY user_id, streak_start DESC;