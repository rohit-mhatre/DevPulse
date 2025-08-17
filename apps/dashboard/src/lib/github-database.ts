import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { 
  GitHubSettings, 
  GitHubRepository, 
  GitHubCommit, 
  GitHubPullRequest, 
  GitHubIssue,
  GitHubStreak,
  GitHubLanguageStats,
  GitHubSyncLog,
  GitHubProductivityMetrics,
  GitHubActivityWidget,
  GitHubContributionCalendar
} from '@/types/github';

export class GitHubDatabase {
  private dbPath: string;

  constructor() {
    const userDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'DevPulse Desktop');
    this.dbPath = path.join(userDataPath, 'devpulse.db');
  }

  private getDatabase(): Database.Database {
    try {
      const db = new Database(this.dbPath);
      // Enable foreign key constraints
      db.pragma('foreign_keys = ON');
      return db;
    } catch (error) {
      throw new Error(`Database not found at ${this.dbPath}. Ensure DevPulse Desktop is installed.`);
    }
  }

  async initializeGitHubSchema(): Promise<void> {
    const db = this.getDatabase();
    try {
      const schemaPath = path.join(__dirname, 'github-schema.sql');
      const schema = await fs.readFile(schemaPath, 'utf-8');
      db.exec(schema);
    } finally {
      db.close();
    }
  }

  // GitHub Settings Operations
  async getGitHubSettings(userId: string = 'default'): Promise<GitHubSettings | null> {
    const db = this.getDatabase();
    try {
      const settings = db.prepare(`
        SELECT * FROM github_settings WHERE user_id = ?
      `).get(userId) as any;

      if (!settings) return null;

      return {
        ...settings,
        tokenExpiresAt: settings.token_expires_at ? new Date(settings.token_expires_at) : undefined,
        lastSyncAt: settings.last_sync_at ? new Date(settings.last_sync_at) : undefined,
        syncEnabled: Boolean(settings.sync_enabled),
        privateReposEnabled: Boolean(settings.private_repos_enabled),
        createdAt: new Date(settings.created_at),
        updatedAt: new Date(settings.updated_at)
      };
    } finally {
      db.close();
    }
  }

  async saveGitHubSettings(settings: Partial<GitHubSettings> & { userId: string }): Promise<void> {
    const db = this.getDatabase();
    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO github_settings (
          user_id, username, access_token, refresh_token, token_expires_at,
          last_sync_at, sync_enabled, sync_frequency_minutes, private_repos_enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        settings.userId,
        settings.username || null,
        settings.accessToken || null,
        settings.refreshToken || null,
        settings.tokenExpiresAt?.toISOString() || null,
        settings.lastSyncAt?.toISOString() || null,
        settings.syncEnabled ? 1 : 0,
        settings.syncFrequencyMinutes || 60,
        settings.privateReposEnabled ? 1 : 0
      );
    } finally {
      db.close();
    }
  }

  // GitHub Repository Operations
  async saveGitHubRepositories(repositories: GitHubRepository[]): Promise<void> {
    const db = this.getDatabase();
    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO github_repositories (
          user_id, github_id, name, full_name, description, language,
          is_private, is_fork, stars_count, forks_count, default_branch,
          clone_url, ssh_url, homepage_url, archived, disabled,
          last_push_at, last_updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const transaction = db.transaction((repos: GitHubRepository[]) => {
        for (const repo of repos) {
          stmt.run(
            repo.userId,
            repo.githubId,
            repo.name,
            repo.fullName,
            repo.description || null,
            repo.language || null,
            repo.isPrivate ? 1 : 0,
            repo.isFork ? 1 : 0,
            repo.starsCount,
            repo.forksCount,
            repo.defaultBranch,
            repo.cloneUrl || null,
            repo.sshUrl || null,
            repo.homepageUrl || null,
            repo.archived ? 1 : 0,
            repo.disabled ? 1 : 0,
            repo.lastPushAt?.toISOString() || null,
            repo.lastUpdatedAt?.toISOString() || null
          );
        }
      });

      transaction(repositories);
    } finally {
      db.close();
    }
  }

  async getGitHubRepositories(userId: string = 'default'): Promise<GitHubRepository[]> {
    const db = this.getDatabase();
    try {
      const repos = db.prepare(`
        SELECT * FROM github_repositories 
        WHERE user_id = ? 
        ORDER BY last_updated_at DESC
      `).all(userId) as any[];

      return repos.map(repo => ({
        ...repo,
        isPrivate: Boolean(repo.is_private),
        isFork: Boolean(repo.is_fork),
        archived: Boolean(repo.archived),
        disabled: Boolean(repo.disabled),
        lastPushAt: repo.last_push_at ? new Date(repo.last_push_at) : undefined,
        lastUpdatedAt: repo.last_updated_at ? new Date(repo.last_updated_at) : undefined,
        createdAt: new Date(repo.created_at),
        updatedAt: new Date(repo.updated_at)
      }));
    } finally {
      db.close();
    }
  }

  // GitHub Commits Operations
  async saveGitHubCommits(commits: GitHubCommit[]): Promise<void> {
    const db = this.getDatabase();
    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO github_commits (
          user_id, repository_id, sha, message, author_name, author_email,
          author_date, committer_name, committer_email, committer_date,
          tree_sha, parent_shas, additions, deletions, changed_files,
          branch_name, is_merge, is_main_branch, linked_activity_log_id,
          confidence_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const transaction = db.transaction((commits: GitHubCommit[]) => {
        for (const commit of commits) {
          stmt.run(
            commit.userId,
            commit.repositoryId,
            commit.sha,
            commit.message,
            commit.authorName || null,
            commit.authorEmail || null,
            commit.authorDate.toISOString(),
            commit.committerName || null,
            commit.committerEmail || null,
            commit.committerDate.toISOString(),
            commit.treeSha || null,
            JSON.stringify(commit.parentShas),
            commit.additions,
            commit.deletions,
            commit.changedFiles,
            commit.branchName || null,
            commit.isMerge ? 1 : 0,
            commit.isMainBranch ? 1 : 0,
            commit.linkedActivityLogId || null,
            commit.confidenceScore || null
          );
        }
      });

      transaction(commits);
    } finally {
      db.close();
    }
  }

  async getGitHubCommits(options: {
    userId?: string;
    repositoryId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  } = {}): Promise<GitHubCommit[]> {
    const db = this.getDatabase();
    try {
      const { userId = 'default', repositoryId, startDate, endDate, limit = 100 } = options;

      let whereConditions = ['user_id = ?'];
      let queryParams: any[] = [userId];

      if (repositoryId) {
        whereConditions.push('repository_id = ?');
        queryParams.push(repositoryId);
      }

      if (startDate) {
        whereConditions.push('author_date >= ?');
        queryParams.push(startDate.toISOString());
      }

      if (endDate) {
        whereConditions.push('author_date <= ?');
        queryParams.push(endDate.toISOString());
      }

      const whereClause = whereConditions.join(' AND ');
      const query = `
        SELECT * FROM github_commits 
        WHERE ${whereClause}
        ORDER BY author_date DESC
        LIMIT ?
      `;

      const commits = db.prepare(query).all(...queryParams, limit) as any[];

      return commits.map(commit => ({
        ...commit,
        parentShas: JSON.parse(commit.parent_shas),
        isMerge: Boolean(commit.is_merge),
        isMainBranch: Boolean(commit.is_main_branch),
        authorDate: new Date(commit.author_date),
        committerDate: new Date(commit.committer_date),
        createdAt: new Date(commit.created_at)
      }));
    } finally {
      db.close();
    }
  }

  // GitHub Pull Requests Operations
  async saveGitHubPullRequests(pullRequests: GitHubPullRequest[]): Promise<void> {
    const db = this.getDatabase();
    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO github_pull_requests (
          user_id, repository_id, github_id, number, title, body, state,
          is_draft, author_login, author_id, assignees, requested_reviewers,
          created_at_github, updated_at_github, closed_at, merged_at,
          head_branch, head_sha, base_branch, base_sha, additions, deletions,
          changed_files, commits_count, comments_count, review_comments_count,
          merged_by_login, merge_commit_sha, linked_focus_session_id,
          estimated_work_hours, productivity_impact_score
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const transaction = db.transaction((prs: GitHubPullRequest[]) => {
        for (const pr of prs) {
          stmt.run(
            pr.userId,
            pr.repositoryId,
            pr.githubId,
            pr.number,
            pr.title,
            pr.body || null,
            pr.state,
            pr.isDraft ? 1 : 0,
            pr.authorLogin || null,
            pr.authorId || null,
            JSON.stringify(pr.assignees),
            JSON.stringify(pr.requestedReviewers),
            pr.createdAtGithub.toISOString(),
            pr.updatedAtGithub.toISOString(),
            pr.closedAt?.toISOString() || null,
            pr.mergedAt?.toISOString() || null,
            pr.headBranch || null,
            pr.headSha || null,
            pr.baseBranch || null,
            pr.baseSha || null,
            pr.additions,
            pr.deletions,
            pr.changedFiles,
            pr.commitsCount,
            pr.commentsCount,
            pr.reviewCommentsCount,
            pr.mergedByLogin || null,
            pr.mergeCommitSha || null,
            pr.linkedFocusSessionId || null,
            pr.estimatedWorkHours || null,
            pr.productivityImpactScore || null
          );
        }
      });

      transaction(pullRequests);
    } finally {
      db.close();
    }
  }

  // GitHub Streaks Operations
  async updateGitHubStreaks(userId: string = 'default'): Promise<void> {
    const db = this.getDatabase();
    try {
      // Calculate daily streaks from commits and PRs
      const query = `
        INSERT OR REPLACE INTO github_streaks (
          user_id, streak_date, commits_count, pull_requests_count,
          issues_closed_count, repositories_worked, lines_added, lines_deleted,
          activity_score, consistency_bonus
        )
        SELECT 
          ? as user_id,
          DATE(activity_date) as streak_date,
          COALESCE(commits_count, 0) as commits_count,
          COALESCE(prs_count, 0) as pull_requests_count,
          COALESCE(issues_count, 0) as issues_closed_count,
          COALESCE(repos_count, 0) as repositories_worked,
          COALESCE(lines_added, 0) as lines_added,
          COALESCE(lines_deleted, 0) as lines_deleted,
          CASE 
            WHEN COALESCE(commits_count, 0) + COALESCE(prs_count, 0) + COALESCE(issues_count, 0) > 0
            THEN (COALESCE(commits_count, 0) * 1.0 + COALESCE(prs_count, 0) * 3.0 + COALESCE(issues_count, 0) * 2.0)
            ELSE 0
          END as activity_score,
          0 as consistency_bonus
        FROM (
          SELECT 
            DATE(author_date) as activity_date,
            COUNT(DISTINCT sha) as commits_count,
            COUNT(DISTINCT repository_id) as repos_count,
            SUM(additions) as lines_added,
            SUM(deletions) as lines_deleted
          FROM github_commits 
          WHERE user_id = ? AND author_date >= DATE('now', '-90 days')
          GROUP BY DATE(author_date)
        ) commits
        FULL OUTER JOIN (
          SELECT 
            DATE(created_at_github) as activity_date,
            COUNT(*) as prs_count
          FROM github_pull_requests 
          WHERE user_id = ? AND created_at_github >= DATE('now', '-90 days')
          GROUP BY DATE(created_at_github)
        ) prs ON commits.activity_date = prs.activity_date
        FULL OUTER JOIN (
          SELECT 
            DATE(closed_at) as activity_date,
            COUNT(*) as issues_count
          FROM github_issues 
          WHERE user_id = ? AND closed_at >= DATE('now', '-90 days') AND state = 'closed'
          GROUP BY DATE(closed_at)
        ) issues ON COALESCE(commits.activity_date, prs.activity_date) = issues.activity_date
      `;

      db.prepare(query).run(userId, userId, userId, userId);
    } finally {
      db.close();
    }
  }

  // Analytics and Dashboard Methods
  async getGitHubProductivityMetrics(userId: string = 'default', days: number = 30): Promise<GitHubProductivityMetrics> {
    const db = this.getDatabase();
    try {
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);

      const metrics = db.prepare(`
        SELECT 
          COUNT(DISTINCT gc.sha) as total_commits,
          COUNT(DISTINCT gpr.id) as total_pull_requests,
          COUNT(DISTINCT CASE WHEN gpr.state = 'merged' THEN gpr.id END) as merged_pull_requests,
          COUNT(DISTINCT gi.id) as total_issues,
          COUNT(DISTINCT CASE WHEN gi.state = 'closed' THEN gi.id END) as closed_issues,
          COALESCE(SUM(gc.additions), 0) as lines_added,
          COALESCE(SUM(gc.deletions), 0) as lines_deleted,
          COUNT(DISTINCT gc.repository_id) as repositories_worked,
          COUNT(DISTINCT gr.language) as languages_used
        FROM github_settings gs
        LEFT JOIN github_repositories gr ON gs.user_id = gr.user_id
        LEFT JOIN github_commits gc ON gr.id = gc.repository_id AND gc.author_date >= ?
        LEFT JOIN github_pull_requests gpr ON gr.id = gpr.repository_id AND gpr.created_at_github >= ?
        LEFT JOIN github_issues gi ON gr.id = gi.repository_id AND gi.created_at_github >= ?
        WHERE gs.user_id = ?
      `).get(sinceDate.toISOString(), sinceDate.toISOString(), sinceDate.toISOString(), userId) as any;

      // Calculate streaks
      const streakData = db.prepare(`
        SELECT 
          COUNT(*) as current_streak,
          MAX(activity_score) as max_activity_score
        FROM (
          SELECT 
            streak_date,
            activity_score,
            ROW_NUMBER() OVER (ORDER BY streak_date DESC) - 
            ROW_NUMBER() OVER (PARTITION BY activity_score > 0 ORDER BY streak_date DESC) as grp
          FROM github_streaks 
          WHERE user_id = ? AND streak_date >= DATE('now', '-365 days')
          ORDER BY streak_date DESC
        ) grouped
        WHERE activity_score > 0 AND grp = 0
      `).get(userId) as any;

      return {
        totalCommits: metrics.total_commits || 0,
        totalPullRequests: metrics.total_pull_requests || 0,
        mergedPullRequests: metrics.merged_pull_requests || 0,
        totalIssues: metrics.total_issues || 0,
        closedIssues: metrics.closed_issues || 0,
        linesAdded: metrics.lines_added || 0,
        linesDeleted: metrics.lines_deleted || 0,
        repositoriesWorked: metrics.repositories_worked || 0,
        languagesUsed: [], // Will be populated separately
        averageCommitsPerDay: Math.round((metrics.total_commits || 0) / days * 10) / 10,
        longestStreak: 0, // Will be calculated
        currentStreak: streakData?.current_streak || 0,
        productivityScore: Math.min(100, Math.round(((metrics.total_commits || 0) + (metrics.merged_pull_requests || 0) * 3) / days * 10)),
        codeQualityScore: 85, // Placeholder - would be calculated from PR review data
        collaborationScore: Math.min(100, (metrics.merged_pull_requests || 0) * 10)
      };
    } finally {
      db.close();
    }
  }

  async getGitHubActivityWidget(userId: string = 'default'): Promise<GitHubActivityWidget> {
    const db = this.getDatabase();
    try {
      const today = new Date();
      const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());

      const todayStats = db.prepare(`
        SELECT 
          COUNT(DISTINCT gc.sha) as today_commits,
          COUNT(DISTINCT gpr.id) as today_prs
        FROM github_commits gc
        LEFT JOIN github_pull_requests gpr ON gc.repository_id = gpr.repository_id 
          AND DATE(gpr.created_at_github) = DATE(gc.author_date)
        WHERE gc.user_id = ? AND DATE(gc.author_date) = DATE('now')
      `).get(userId) as any;

      const weekStats = db.prepare(`
        SELECT 
          COUNT(DISTINCT gc.sha) as week_commits,
          COUNT(DISTINCT gpr.id) as week_prs
        FROM github_commits gc
        LEFT JOIN github_pull_requests gpr ON gc.repository_id = gpr.repository_id
        WHERE gc.user_id = ? AND gc.author_date >= ?
      `).get(userId, startOfWeek.toISOString()) as any;

      const recentRepos = db.prepare(`
        SELECT DISTINCT gr.name
        FROM github_repositories gr
        JOIN github_commits gc ON gr.id = gc.repository_id
        WHERE gr.user_id = ? AND gc.author_date >= DATE('now', '-7 days')
        ORDER BY MAX(gc.author_date) DESC
        LIMIT 5
      `).all(userId) as any[];

      const topLanguages = db.prepare(`
        SELECT 
          gr.language,
          COUNT(gc.sha) as commits,
          ROUND(COUNT(gc.sha) * 100.0 / SUM(COUNT(gc.sha)) OVER (), 1) as percentage
        FROM github_repositories gr
        JOIN github_commits gc ON gr.id = gc.repository_id
        WHERE gr.user_id = ? AND gr.language IS NOT NULL 
          AND gc.author_date >= DATE('now', '-30 days')
        GROUP BY gr.language
        ORDER BY commits DESC
        LIMIT 5
      `).all(userId) as any[];

      const streakInfo = db.prepare(`
        SELECT 
          COUNT(*) as current_streak
        FROM (
          SELECT streak_date
          FROM github_streaks 
          WHERE user_id = ? AND activity_score > 0
          ORDER BY streak_date DESC
        ) recent
        WHERE recent.streak_date >= DATE('now', '-' || ROW_NUMBER() OVER (ORDER BY streak_date DESC) || ' days')
      `).get(userId) as any;

      return {
        todayCommits: todayStats?.today_commits || 0,
        weekCommits: weekStats?.week_commits || 0,
        todayPullRequests: todayStats?.today_prs || 0,
        weekPullRequests: weekStats?.week_prs || 0,
        recentRepositories: recentRepos.map(r => r.name),
        topLanguages: topLanguages.map(lang => ({
          name: lang.language,
          percentage: lang.percentage,
          commits: lang.commits
        })),
        streakInfo: {
          current: streakInfo?.current_streak || 0,
          longest: 0, // Would be calculated separately
          lastActivity: new Date() // Would be calculated from latest commit
        }
      };
    } finally {
      db.close();
    }
  }

  async getGitHubContributionCalendar(userId: string = 'default', year: number = new Date().getFullYear()): Promise<GitHubContributionCalendar[]> {
    const db = this.getDatabase();
    try {
      const calendar = db.prepare(`
        SELECT 
          gs.streak_date as date,
          gs.commits_count as commits,
          gs.pull_requests_count as pull_requests,
          gs.issues_closed_count as issues_closed,
          gs.activity_score,
          CASE 
            WHEN gs.activity_score = 0 THEN 0
            WHEN gs.activity_score <= 2 THEN 1
            WHEN gs.activity_score <= 5 THEN 2
            WHEN gs.activity_score <= 10 THEN 3
            ELSE 4
          END as activity_level
        FROM github_streaks gs
        WHERE gs.user_id = ? 
          AND strftime('%Y', gs.streak_date) = ?
        ORDER BY gs.streak_date ASC
      `).all(userId, year.toString()) as any[];

      return calendar.map(day => ({
        date: new Date(day.date),
        commits: day.commits,
        pullRequests: day.pull_requests,
        issuesClosed: day.issues_closed,
        activityLevel: day.activity_level as 0 | 1 | 2 | 3 | 4,
        contributionScore: day.activity_score
      }));
    } finally {
      db.close();
    }
  }

  // Sync Log Operations
  async createSyncLog(syncLog: Omit<GitHubSyncLog, 'id' | 'createdAt'>): Promise<string> {
    const db = this.getDatabase();
    try {
      const id = this.generateId();
      
      db.prepare(`
        INSERT INTO github_sync_log (
          id, user_id, sync_type, status, repositories_synced, commits_synced,
          pull_requests_synced, issues_synced, error_message, error_count,
          api_calls_made, rate_limit_remaining, rate_limit_reset_at,
          started_at, completed_at, duration_seconds
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id,
        syncLog.userId,
        syncLog.syncType,
        syncLog.status,
        syncLog.repositoriesSynced,
        syncLog.commitsSynced,
        syncLog.pullRequestsSynced,
        syncLog.issuesSynced,
        syncLog.errorMessage || null,
        syncLog.errorCount,
        syncLog.apiCallsMade,
        syncLog.rateLimitRemaining || null,
        syncLog.rateLimitResetAt?.toISOString() || null,
        syncLog.startedAt.toISOString(),
        syncLog.completedAt?.toISOString() || null,
        syncLog.durationSeconds || null
      );

      return id;
    } finally {
      db.close();
    }
  }

  async updateSyncLog(id: string, updates: Partial<GitHubSyncLog>): Promise<void> {
    const db = this.getDatabase();
    try {
      const setClause = Object.keys(updates)
        .filter(key => key !== 'id' && key !== 'createdAt')
        .map(key => {
          const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          return `${dbKey} = ?`;
        })
        .join(', ');

      const values = Object.entries(updates)
        .filter(([key]) => key !== 'id' && key !== 'createdAt')
        .map(([, value]) => {
          if (value instanceof Date) return value.toISOString();
          return value;
        });

      if (setClause) {
        db.prepare(`UPDATE github_sync_log SET ${setClause} WHERE id = ?`).run(...values, id);
      }
    } finally {
      db.close();
    }
  }

  // Utility methods
  private generateId(): string {
    return 'gh_' + Math.random().toString(36).substr(2, 9);
  }

  async isGitHubIntegrationEnabled(userId: string = 'default'): Promise<boolean> {
    const settings = await this.getGitHubSettings(userId);
    return settings?.syncEnabled && !!settings.accessToken;
  }

  async getLastSyncTime(userId: string = 'default'): Promise<Date | null> {
    const settings = await this.getGitHubSettings(userId);
    return settings?.lastSyncAt || null;
  }
}

// Singleton instance
export const gitHubDB = new GitHubDatabase();