import { 
  GitHubUser, 
  GitHubRepo, 
  GitHubCommitResponse, 
  GitHubPullRequestResponse,
  GitHubAPIError,
  GitHubRepository,
  GitHubCommit,
  GitHubPullRequest
} from '@/types/github';

export class GitHubAPIService {
  private baseUrl = 'https://api.github.com';
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async makeRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const defaultHeaders = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'DevPulse/1.0',
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      // Handle rate limiting
      if (response.status === 403 && response.headers.get('X-RateLimit-Remaining') === '0') {
        const resetTime = response.headers.get('X-RateLimit-Reset');
        const resetDate = resetTime ? new Date(parseInt(resetTime) * 1000) : new Date();
        
        throw new GitHubAPIError({
          message: 'GitHub API rate limit exceeded',
          status: 403,
          headers: Object.fromEntries(response.headers.entries()),
          rateLimitInfo: {
            limit: parseInt(response.headers.get('X-RateLimit-Limit') || '0'),
            remaining: 0,
            reset: resetDate
          }
        });
      }

      if (!response.ok) {
        throw new GitHubAPIError({
          message: `GitHub API error: ${response.status} ${response.statusText}`,
          status: response.status,
          headers: Object.fromEntries(response.headers.entries())
        });
      }

      return await response.json();
    } catch (error) {
      if (error instanceof GitHubAPIError) {
        throw error;
      }
      throw new GitHubAPIError({
        message: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 0
      });
    }
  }

  // User Information
  async getCurrentUser(): Promise<GitHubUser> {
    return this.makeRequest<GitHubUser>('/user');
  }

  // Repository Operations
  async getRepositories(options: {
    type?: 'all' | 'owner' | 'member';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<GitHubRepo[]> {
    const params = new URLSearchParams();
    
    if (options.type) params.append('type', options.type);
    if (options.sort) params.append('sort', options.sort);
    if (options.direction) params.append('direction', options.direction);
    if (options.per_page) params.append('per_page', options.per_page.toString());
    if (options.page) params.append('page', options.page.toString());

    const endpoint = `/user/repos${params.toString() ? `?${params.toString()}` : ''}`;
    return this.makeRequest<GitHubRepo[]>(endpoint);
  }

  async getRepository(owner: string, repo: string): Promise<GitHubRepo> {
    return this.makeRequest<GitHubRepo>(`/repos/${owner}/${repo}`);
  }

  // Commit Operations
  async getCommits(owner: string, repo: string, options: {
    sha?: string; // Branch or commit SHA
    since?: string; // ISO 8601 date
    until?: string; // ISO 8601 date
    author?: string;
    per_page?: number;
    page?: number;
  } = {}): Promise<GitHubCommitResponse[]> {
    const params = new URLSearchParams();
    
    if (options.sha) params.append('sha', options.sha);
    if (options.since) params.append('since', options.since);
    if (options.until) params.append('until', options.until);
    if (options.author) params.append('author', options.author);
    if (options.per_page) params.append('per_page', options.per_page.toString());
    if (options.page) params.append('page', options.page.toString());

    const endpoint = `/repos/${owner}/${repo}/commits${params.toString() ? `?${params.toString()}` : ''}`;
    return this.makeRequest<GitHubCommitResponse[]>(endpoint);
  }

  async getCommit(owner: string, repo: string, sha: string): Promise<GitHubCommitResponse> {
    return this.makeRequest<GitHubCommitResponse>(`/repos/${owner}/${repo}/commits/${sha}`);
  }

  // Pull Request Operations
  async getPullRequests(owner: string, repo: string, options: {
    state?: 'open' | 'closed' | 'all';
    sort?: 'created' | 'updated' | 'popularity';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<GitHubPullRequestResponse[]> {
    const params = new URLSearchParams();
    
    if (options.state) params.append('state', options.state);
    if (options.sort) params.append('sort', options.sort);
    if (options.direction) params.append('direction', options.direction);
    if (options.per_page) params.append('per_page', options.per_page.toString());
    if (options.page) params.append('page', options.page.toString());

    const endpoint = `/repos/${owner}/${repo}/pulls${params.toString() ? `?${params.toString()}` : ''}`;
    return this.makeRequest<GitHubPullRequestResponse[]>(endpoint);
  }

  async getPullRequest(owner: string, repo: string, pullNumber: number): Promise<GitHubPullRequestResponse> {
    return this.makeRequest<GitHubPullRequestResponse>(`/repos/${owner}/${repo}/pulls/${pullNumber}`);
  }

  // Issues Operations
  async getIssues(owner: string, repo: string, options: {
    state?: 'open' | 'closed' | 'all';
    sort?: 'created' | 'updated';
    direction?: 'asc' | 'desc';
    assignee?: string;
    labels?: string;
    since?: string;
    per_page?: number;
    page?: number;
  } = {}) {
    const params = new URLSearchParams();
    
    if (options.state) params.append('state', options.state);
    if (options.sort) params.append('sort', options.sort);
    if (options.direction) params.append('direction', options.direction);
    if (options.assignee) params.append('assignee', options.assignee);
    if (options.labels) params.append('labels', options.labels);
    if (options.since) params.append('since', options.since);
    if (options.per_page) params.append('per_page', options.per_page.toString());
    if (options.page) params.append('page', options.page.toString());

    const endpoint = `/repos/${owner}/${repo}/issues${params.toString() ? `?${params.toString()}` : ''}`;
    return this.makeRequest(endpoint);
  }

  // User Activity
  async getUserEvents(username: string, options: {
    per_page?: number;
    page?: number;
  } = {}) {
    const params = new URLSearchParams();
    if (options.per_page) params.append('per_page', options.per_page.toString());
    if (options.page) params.append('page', options.page.toString());

    const endpoint = `/users/${username}/events${params.toString() ? `?${params.toString()}` : ''}`;
    return this.makeRequest(endpoint);
  }

  // Rate Limit Information
  async getRateLimit() {
    return this.makeRequest('/rate_limit');
  }

  // Search Operations
  async searchRepositories(query: string, options: {
    sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
    order?: 'desc' | 'asc';
    per_page?: number;
    page?: number;
  } = {}) {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (options.sort) params.append('sort', options.sort);
    if (options.order) params.append('order', options.order);
    if (options.per_page) params.append('per_page', options.per_page.toString());
    if (options.page) params.append('page', options.page.toString());

    const endpoint = `/search/repositories?${params.toString()}`;
    return this.makeRequest(endpoint);
  }

  // Data Transformation Methods
  transformRepositoryData(apiRepo: GitHubRepo, userId: string): GitHubRepository {
    return {
      id: '', // Will be generated by database
      userId,
      githubId: apiRepo.id,
      name: apiRepo.name,
      fullName: apiRepo.full_name,
      description: apiRepo.description || undefined,
      language: apiRepo.language || undefined,
      isPrivate: apiRepo.private,
      isFork: apiRepo.fork,
      starsCount: apiRepo.stargazers_count,
      forksCount: apiRepo.forks_count,
      defaultBranch: apiRepo.default_branch,
      cloneUrl: apiRepo.clone_url,
      sshUrl: apiRepo.ssh_url,
      homepageUrl: apiRepo.homepage || undefined,
      archived: apiRepo.archived,
      disabled: apiRepo.disabled,
      lastPushAt: apiRepo.pushed_at ? new Date(apiRepo.pushed_at) : undefined,
      lastUpdatedAt: new Date(apiRepo.updated_at),
      createdAt: new Date(), // Will be set by database
      updatedAt: new Date() // Will be set by database
    };
  }

  transformCommitData(apiCommit: GitHubCommitResponse, userId: string, repositoryId: string, branchName?: string): GitHubCommit {
    return {
      id: '', // Will be generated by database
      userId,
      repositoryId,
      sha: apiCommit.sha,
      message: apiCommit.commit.message,
      authorName: apiCommit.commit.author.name,
      authorEmail: apiCommit.commit.author.email,
      authorDate: new Date(apiCommit.commit.author.date),
      committerName: apiCommit.commit.committer.name,
      committerEmail: apiCommit.commit.committer.email,
      committerDate: new Date(apiCommit.commit.committer.date),
      treeSha: apiCommit.commit.tree.sha,
      parentShas: apiCommit.parents.map(p => p.sha),
      additions: apiCommit.stats?.additions || 0,
      deletions: apiCommit.stats?.deletions || 0,
      changedFiles: apiCommit.files?.length || 0,
      branchName,
      isMerge: apiCommit.parents.length > 1,
      isMainBranch: branchName === 'main' || branchName === 'master',
      linkedActivityLogId: undefined,
      confidenceScore: undefined,
      createdAt: new Date()
    };
  }

  transformPullRequestData(apiPR: GitHubPullRequestResponse, userId: string, repositoryId: string): GitHubPullRequest {
    return {
      id: '', // Will be generated by database
      userId,
      repositoryId,
      githubId: apiPR.id,
      number: apiPR.number,
      title: apiPR.title,
      body: apiPR.body || undefined,
      state: apiPR.state as 'open' | 'closed' | 'merged',
      isDraft: apiPR.draft,
      authorLogin: apiPR.user.login,
      authorId: apiPR.user.id,
      assignees: apiPR.assignees.map(a => a.login),
      requestedReviewers: apiPR.requested_reviewers.map(r => r.login),
      createdAtGithub: new Date(apiPR.created_at),
      updatedAtGithub: new Date(apiPR.updated_at),
      closedAt: apiPR.closed_at ? new Date(apiPR.closed_at) : undefined,
      mergedAt: apiPR.merged_at ? new Date(apiPR.merged_at) : undefined,
      headBranch: apiPR.head.ref,
      headSha: apiPR.head.sha,
      baseBranch: apiPR.base.ref,
      baseSha: apiPR.base.sha,
      additions: apiPR.additions,
      deletions: apiPR.deletions,
      changedFiles: apiPR.changed_files,
      commitsCount: apiPR.commits,
      commentsCount: apiPR.comments,
      reviewCommentsCount: apiPR.review_comments,
      mergedByLogin: apiPR.merged_by?.login,
      mergeCommitSha: apiPR.merge_commit_sha || undefined,
      linkedFocusSessionId: undefined,
      estimatedWorkHours: undefined,
      productivityImpactScore: undefined,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  // Utility Methods
  async validateToken(): Promise<boolean> {
    try {
      await this.getCurrentUser();
      return true;
    } catch (error) {
      return false;
    }
  }

  async getRateLimitStatus() {
    try {
      const response = await this.makeRequest('/rate_limit');
      return {
        limit: response.rate.limit,
        remaining: response.rate.remaining,
        reset: new Date(response.rate.reset * 1000),
        used: response.rate.used
      };
    } catch (error) {
      return null;
    }
  }
}

// Custom error class for GitHub API errors
class GitHubAPIError extends Error {
  public status: number;
  public headers?: Record<string, string>;
  public rateLimitInfo?: {
    limit: number;
    remaining: number;
    reset: Date;
  };

  constructor(errorInfo: {
    message: string;
    status: number;
    headers?: Record<string, string>;
    rateLimitInfo?: {
      limit: number;
      remaining: number;
      reset: Date;
    };
  }) {
    super(errorInfo.message);
    this.name = 'GitHubAPIError';
    this.status = errorInfo.status;
    this.headers = errorInfo.headers;
    this.rateLimitInfo = errorInfo.rateLimitInfo;
  }
}

// Export the error class
export { GitHubAPIError };

// OAuth utility functions
export const GitHubOAuth = {
  getAuthUrl(clientId: string, scopes: string[] = ['repo', 'user:email'], state?: string): string {
    const params = new URLSearchParams({
      client_id: clientId,
      scope: scopes.join(' '),
      redirect_uri: `${window.location.origin}/api/auth/github/callback`,
    });

    if (state) {
      params.append('state', state);
    }

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  },

  async exchangeCodeForToken(code: string, clientId: string, clientSecret: string): Promise<{
    access_token: string;
    token_type: string;
    scope: string;
  }> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange code for token: ${response.statusText}`);
    }

    return await response.json();
  }
};

// Helper function to create GitHub API service instance
export function createGitHubAPI(accessToken: string): GitHubAPIService {
  return new GitHubAPIService(accessToken);
}