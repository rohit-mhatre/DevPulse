import { GitHubAPIService, GitHubAPIError } from './github-api';
import { gitHubDB } from './github-database';
import { devPulseDB } from './database';
import { 
  GitHubSyncLog, 
  GitHubSyncStatus, 
  GitHubRepository, 
  GitHubCommit,
  GitHubPullRequest 
} from '@/types/github';

export class GitHubSyncService {
  private api: GitHubAPIService | null = null;
  private userId: string;
  private isRunning = false;
  private syncTimeoutId: NodeJS.Timeout | null = null;

  constructor(userId: string = 'default') {
    this.userId = userId;
  }

  async initialize(): Promise<void> {
    const settings = await gitHubDB.getGitHubSettings(this.userId);
    if (settings?.accessToken && settings.syncEnabled) {
      this.api = new GitHubAPIService(settings.accessToken);
      this.scheduleNextSync();
    }
  }

  async startSync(type: 'full' | 'incremental' | 'manual' = 'incremental'): Promise<string> {
    if (this.isRunning) {
      throw new Error('Sync is already running');
    }

    const settings = await gitHubDB.getGitHubSettings(this.userId);
    if (!settings?.accessToken) {
      throw new Error('GitHub access token not configured');
    }

    if (!this.api) {
      this.api = new GitHubAPIService(settings.accessToken);
    }

    this.isRunning = true;

    // Create sync log entry
    const syncLogId = await gitHubDB.createSyncLog({
      userId: this.userId,
      syncType: type,
      status: 'started',
      repositoriesSynced: 0,
      commitsSynced: 0,
      pullRequestsSynced: 0,
      issuesSynced: 0,
      errorCount: 0,
      apiCallsMade: 0,
      startedAt: new Date()
    });

    try {
      await this.performSync(syncLogId, type);
      
      await gitHubDB.updateSyncLog(syncLogId, {
        status: 'completed',
        completedAt: new Date(),
        durationSeconds: Math.floor((Date.now() - new Date().getTime()) / 1000)
      });

      // Update last sync time in settings
      await gitHubDB.saveGitHubSettings({
        userId: this.userId,
        lastSyncAt: new Date()
      });

      // Schedule next sync
      this.scheduleNextSync();

    } catch (error) {
      await gitHubDB.updateSyncLog(syncLogId, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date()
      });
      throw error;
    } finally {
      this.isRunning = false;
    }

    return syncLogId;
  }

  private async performSync(syncLogId: string, type: 'full' | 'incremental' | 'manual'): Promise<void> {
    if (!this.api) throw new Error('GitHub API not initialized');

    let apiCallCount = 0;
    const startTime = Date.now();

    try {
      // Step 1: Sync repositories
      console.log('Starting repository sync...');
      const repositories = await this.syncRepositories();
      apiCallCount += Math.ceil(repositories.length / 100); // Estimated API calls

      await gitHubDB.updateSyncLog(syncLogId, {
        status: 'in_progress',
        repositoriesSynced: repositories.length,
        apiCallsMade: apiCallCount
      });

      // Step 2: Sync commits for each repository
      console.log('Starting commits sync...');
      let totalCommits = 0;
      
      for (const repo of repositories) {
        try {
          const commits = await this.syncCommits(repo, type);
          totalCommits += commits.length;
          apiCallCount += Math.ceil(commits.length / 100);

          // Update progress periodically
          if (totalCommits % 100 === 0) {
            await gitHubDB.updateSyncLog(syncLogId, {
              commitsSynced: totalCommits,
              apiCallsMade: apiCallCount
            });
          }
        } catch (error) {
          console.error(`Error syncing commits for repo ${repo.fullName}:`, error);
          // Continue with other repositories
        }
      }

      // Step 3: Sync pull requests
      console.log('Starting pull requests sync...');
      let totalPRs = 0;
      
      for (const repo of repositories) {
        try {
          const prs = await this.syncPullRequests(repo, type);
          totalPRs += prs.length;
          apiCallCount += Math.ceil(prs.length / 100);

          if (totalPRs % 50 === 0) {
            await gitHubDB.updateSyncLog(syncLogId, {
              pullRequestsSynced: totalPRs,
              apiCallsMade: apiCallCount
            });
          }
        } catch (error) {
          console.error(`Error syncing PRs for repo ${repo.fullName}:`, error);
        }
      }

      // Step 4: Update streaks and analytics
      console.log('Updating GitHub streaks...');
      await gitHubDB.updateGitHubStreaks(this.userId);

      // Step 5: Correlate with DevPulse activity logs
      console.log('Correlating with activity logs...');
      await this.correlateWithActivityLogs();

      console.log(`Sync completed: ${repositories.length} repos, ${totalCommits} commits, ${totalPRs} PRs`);

      // Final update
      await gitHubDB.updateSyncLog(syncLogId, {
        repositoriesSynced: repositories.length,
        commitsSynced: totalCommits,
        pullRequestsSynced: totalPRs,
        apiCallsMade: apiCallCount
      });

    } catch (error) {
      if (error instanceof GitHubAPIError && error.rateLimitInfo) {
        await gitHubDB.updateSyncLog(syncLogId, {
          errorMessage: 'GitHub API rate limit exceeded',
          rateLimitRemaining: error.rateLimitInfo.remaining,
          rateLimitResetAt: error.rateLimitInfo.reset
        });
      }
      throw error;
    }
  }

  private async syncRepositories(): Promise<GitHubRepository[]> {
    if (!this.api) throw new Error('GitHub API not initialized');

    const repositories: GitHubRepository[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const apiRepos = await this.api.getRepositories({
        type: 'all',
        sort: 'updated',
        direction: 'desc',
        per_page: perPage,
        page
      });

      if (apiRepos.length === 0) break;

      const transformedRepos = apiRepos.map(repo => 
        this.api!.transformRepositoryData(repo, this.userId)
      );

      repositories.push(...transformedRepos);

      if (apiRepos.length < perPage) break;
      page++;
    }

    // Save repositories to database
    await gitHubDB.saveGitHubRepositories(repositories);

    return repositories;
  }

  private async syncCommits(repository: GitHubRepository, type: 'full' | 'incremental' | 'manual'): Promise<GitHubCommit[]> {
    if (!this.api) throw new Error('GitHub API not initialized');

    const [owner, repo] = repository.fullName.split('/');
    const commits: GitHubCommit[] = [];

    // Determine the date range for syncing
    let since: string | undefined;
    if (type === 'incremental') {
      const lastSync = await gitHubDB.getLastSyncTime(this.userId);
      if (lastSync) {
        since = lastSync.toISOString();
      } else {
        // If no last sync, get commits from last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        since = thirtyDaysAgo.toISOString();
      }
    } else if (type === 'manual') {
      // For manual sync, get last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      since = sevenDaysAgo.toISOString();
    }

    try {
      let page = 1;
      const perPage = 100;

      while (true) {
        const apiCommits = await this.api.getCommits(owner, repo, {
          since,
          per_page: perPage,
          page
        });

        if (apiCommits.length === 0) break;

        for (const apiCommit of apiCommits) {
          // Get detailed commit information including stats
          try {
            const detailedCommit = await this.api.getCommit(owner, repo, apiCommit.sha);
            const transformedCommit = this.api.transformCommitData(
              detailedCommit, 
              this.userId, 
              repository.id,
              repository.defaultBranch
            );
            commits.push(transformedCommit);
          } catch (error) {
            console.error(`Error fetching detailed commit ${apiCommit.sha}:`, error);
            // Continue with basic commit data
            const transformedCommit = this.api.transformCommitData(
              apiCommit, 
              this.userId, 
              repository.id,
              repository.defaultBranch
            );
            commits.push(transformedCommit);
          }
        }

        if (apiCommits.length < perPage) break;
        page++;

        // Rate limiting: wait between pages
        await this.delay(100);
      }

      // Save commits to database
      if (commits.length > 0) {
        await gitHubDB.saveGitHubCommits(commits);
      }

    } catch (error) {
      console.error(`Error syncing commits for ${repository.fullName}:`, error);
      throw error;
    }

    return commits;
  }

  private async syncPullRequests(repository: GitHubRepository, type: 'full' | 'incremental' | 'manual'): Promise<GitHubPullRequest[]> {
    if (!this.api) throw new Error('GitHub API not initialized');

    const [owner, repo] = repository.fullName.split('/');
    const pullRequests: GitHubPullRequest[] = [];

    try {
      // Sync closed/merged PRs first (most important for productivity tracking)
      const states: ('open' | 'closed')[] = ['closed', 'open'];
      
      for (const state of states) {
        let page = 1;
        const perPage = 100;

        while (true) {
          const apiPRs = await this.api.getPullRequests(owner, repo, {
            state,
            sort: 'updated',
            direction: 'desc',
            per_page: perPage,
            page
          });

          if (apiPRs.length === 0) break;

          // Filter PRs based on sync type
          let filteredPRs = apiPRs;
          if (type === 'incremental') {
            const lastSync = await gitHubDB.getLastSyncTime(this.userId);
            if (lastSync) {
              filteredPRs = apiPRs.filter(pr => new Date(pr.updated_at) > lastSync);
            }
          }

          const transformedPRs = filteredPRs.map(pr => 
            this.api!.transformPullRequestData(pr, this.userId, repository.id)
          );

          pullRequests.push(...transformedPRs);

          if (apiPRs.length < perPage) break;
          page++;

          // Rate limiting
          await this.delay(100);
        }
      }

      // Save pull requests to database
      if (pullRequests.length > 0) {
        await gitHubDB.saveGitHubPullRequests(pullRequests);
      }

    } catch (error) {
      console.error(`Error syncing pull requests for ${repository.fullName}:`, error);
      throw error;
    }

    return pullRequests;
  }

  private async correlateWithActivityLogs(): Promise<void> {
    // Get recent commits (last 7 days) that aren't correlated yet
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentCommits = await gitHubDB.getGitHubCommits({
      userId: this.userId,
      startDate: sevenDaysAgo
    });

    const unlinkedCommits = recentCommits.filter(commit => !commit.linkedActivityLogId);

    // Get activity logs from the same period
    const activities = await devPulseDB.getActivities({
      startDate: sevenDaysAgo.toISOString(),
      endDate: new Date().toISOString()
    });

    // Correlate commits with activity logs
    for (const commit of unlinkedCommits) {
      const correlatedActivity = this.findBestActivityMatch(commit, activities);
      
      if (correlatedActivity && correlatedActivity.confidence > 0.6) {
        // Update commit with correlation
        await this.updateCommitCorrelation(
          commit.sha, 
          correlatedActivity.activityId, 
          correlatedActivity.confidence
        );
      }
    }
  }

  private findBestActivityMatch(commit: GitHubCommit, activities: any[]) {
    let bestMatch = null;
    let highestConfidence = 0;

    const commitTime = commit.authorDate.getTime();

    for (const activity of activities) {
      const activityTime = new Date(activity.started_at).getTime();
      const timeDiff = Math.abs(commitTime - activityTime);
      
      // Time correlation (closer times = higher score)
      const timeScore = Math.max(0, 1 - (timeDiff / (6 * 60 * 60 * 1000))); // 6 hours window
      
      // Project correlation
      let projectScore = 0;
      if (activity.project_path && commit.repositoryId) {
        // This would need repository path mapping
        projectScore = 0.5; // Placeholder
      }

      // Activity type correlation
      let activityScore = 0;
      const codingTypes = ['code', 'coding', 'development', 'programming'];
      if (codingTypes.includes(activity.activity_type?.toLowerCase())) {
        activityScore = 0.8;
      }

      const totalConfidence = (timeScore * 0.6) + (projectScore * 0.2) + (activityScore * 0.2);

      if (totalConfidence > highestConfidence && totalConfidence > 0.3) {
        highestConfidence = totalConfidence;
        bestMatch = {
          activityId: activity.id,
          confidence: totalConfidence
        };
      }
    }

    return bestMatch;
  }

  private async updateCommitCorrelation(commitSha: string, activityLogId: string, confidence: number): Promise<void> {
    // This would require an update method in GitHubDatabase
    // For now, we'll skip the implementation
    console.log(`Correlated commit ${commitSha} with activity ${activityLogId} (confidence: ${confidence})`);
  }

  private scheduleNextSync(): void {
    if (this.syncTimeoutId) {
      clearTimeout(this.syncTimeoutId);
    }

    gitHubDB.getGitHubSettings(this.userId).then(settings => {
      if (settings?.syncEnabled) {
        const intervalMs = (settings.syncFrequencyMinutes || 60) * 60 * 1000;
        
        this.syncTimeoutId = setTimeout(() => {
          this.startSync('incremental').catch(error => {
            console.error('Scheduled sync failed:', error);
          });
        }, intervalMs);
      }
    });
  }

  async getSyncStatus(): Promise<GitHubSyncStatus> {
    const settings = await gitHubDB.getGitHubSettings(this.userId);
    
    if (!settings?.syncEnabled) {
      return {
        isActive: false,
        lastSync: null,
        nextSync: null,
        status: 'idle',
        errors: [],
        apiCallsRemaining: 0,
        rateLimitResetAt: null
      };
    }

    let rateLimitInfo = null;
    if (this.api) {
      rateLimitInfo = await this.api.getRateLimitStatus();
    }

    const nextSync = settings.lastSyncAt ? 
      new Date(settings.lastSyncAt.getTime() + (settings.syncFrequencyMinutes * 60 * 1000)) : 
      new Date();

    return {
      isActive: this.isRunning,
      lastSync: settings.lastSyncAt || null,
      nextSync: this.isRunning ? null : nextSync,
      status: this.isRunning ? 'syncing' : 'idle',
      errors: [],
      apiCallsRemaining: rateLimitInfo?.remaining || 0,
      rateLimitResetAt: rateLimitInfo?.reset || null
    };
  }

  async stopSync(): Promise<void> {
    if (this.syncTimeoutId) {
      clearTimeout(this.syncTimeoutId);
      this.syncTimeoutId = null;
    }
    this.isRunning = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance for the default user
export const gitHubSync = new GitHubSyncService();