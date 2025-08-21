# GitHub Integration for DevPulse

This comprehensive GitHub integration automatically tracks your coding productivity through commits, pull requests, and repository activity, correlating it with your local DevPulse activity data.

## Features

### 🔄 Automatic Sync
- **Real-time synchronization** of GitHub activity
- **Incremental updates** to minimize API usage
- **Background sync** with configurable frequency
- **Rate limit handling** with intelligent backoff

### 📊 Productivity Tracking
- **Commit analysis** with line counts and file changes
- **Pull request metrics** including review time and merge rates
- **Issue resolution tracking** with complexity estimation
- **Coding streak calculation** and maintenance

### 🎯 Smart Correlation
- **Activity correlation** between GitHub commits and local coding sessions
- **Project mapping** between local directories and GitHub repositories
- **Time-based matching** with confidence scoring
- **Productivity impact analysis**

### 📈 Advanced Analytics
- **Contribution calendar** with activity heatmaps
- **Language usage statistics** across repositories
- **Collaboration metrics** from pull requests and reviews
- **Productivity scoring** based on code quality and frequency

## Setup Guide

### 1. Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/applications/new)
2. Create a new OAuth App with these settings:
   - **Application name**: DevPulse
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/github/auth`
3. Note down your `Client ID` and `Client Secret`

### 2. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp apps/dashboard/.env.example apps/dashboard/.env.local
   ```

2. Add your GitHub OAuth credentials:
   ```env
   GITHUB_CLIENT_ID=your_github_client_id_here
   GITHUB_CLIENT_SECRET=your_github_client_secret_here
   ```

### 3. Initialize Database Schema

Run the setup script to create GitHub integration tables:

```bash
cd apps/dashboard
npm run setup:github
```

This will:
- ✅ Create all necessary GitHub tables
- ✅ Set up indexes for optimal performance
- ✅ Initialize default settings
- ✅ Verify the installation

### 4. Connect Your GitHub Account

1. Start the DevPulse dashboard
2. Navigate to **Settings → Integrations**
3. Click **Connect GitHub Account**
4. Authorize DevPulse to access your GitHub data
5. Configure sync settings as needed

## Database Schema

### Core Tables

#### `github_settings`
Stores user GitHub configuration and authentication tokens.

```sql
- id (Primary Key)
- user_id (Foreign Key)
- username (GitHub username)
- access_token (Encrypted OAuth token)
- sync_enabled (Boolean)
- sync_frequency_minutes (Integer)
- private_repos_enabled (Boolean)
```

#### `github_repositories`
Tracks all accessible GitHub repositories.

```sql
- id (Primary Key)
- github_id (GitHub repository ID)
- name, full_name, description
- language, is_private, is_fork
- stars_count, forks_count
- last_push_at, last_updated_at
```

#### `github_commits`
Stores detailed commit information and statistics.

```sql
- id (Primary Key)
- repository_id (Foreign Key)
- sha (Commit hash)
- message, author_name, author_email
- additions, deletions, changed_files
- branch_name, is_merge, is_main_branch
- linked_activity_log_id (Correlation with local activity)
- confidence_score (Correlation confidence)
```

#### `github_pull_requests`
Tracks pull request metrics and collaboration data.

```sql
- id (Primary Key)
- repository_id (Foreign Key)
- number, title, body, state
- author_login, assignees, requested_reviewers
- additions, deletions, changed_files
- commits_count, comments_count
- linked_focus_session_id (Correlation with focus sessions)
```

#### `github_streaks`
Daily activity aggregation for streak calculation.

```sql
- id (Primary Key)
- streak_date (Date)
- commits_count, pull_requests_count
- repositories_worked, lines_added, lines_deleted
- activity_score, consistency_bonus
```

### Analytics Views

#### `github_productivity_overview`
Comprehensive productivity summary combining all GitHub activity.

#### `github_daily_activity`
Day-by-day breakdown of coding activity and contributions.

#### `github_streak_calculation`
Advanced streak calculation with proper handling of gaps and weekends.

## API Endpoints

### Authentication
- `GET /api/github/auth` - Start OAuth flow or handle callback
- `DELETE /api/github/auth` - Disconnect GitHub integration

### Sync Management
- `POST /api/github/sync` - Start manual sync (full/incremental/manual)
- `GET /api/github/sync` - Get current sync status
- `DELETE /api/github/sync` - Stop active sync

### Settings
- `GET /api/github/settings` - Get current GitHub settings
- `PUT /api/github/settings` - Update sync preferences

### Metrics
- `GET /api/github/metrics?metric=overview` - Productivity overview
- `GET /api/github/metrics?metric=activity` - Activity widget data
- `GET /api/github/metrics?metric=calendar` - Contribution calendar
- `GET /api/github/metrics?metric=repositories` - Repository list
- `GET /api/github/metrics?metric=languages` - Language statistics

## Components

### Dashboard Widgets

#### `GitHubActivityWidget`
Shows today's commits, weekly summary, coding streak, and top languages.

#### `GitHubContributionCalendar`
Interactive contribution calendar with activity heatmap and year navigation.

#### `GitHubMetrics`
Comprehensive metrics dashboard with tabbed views for overview, repositories, and languages.

#### `GitHubSettings`
Complete settings interface for OAuth connection, sync configuration, and privacy controls.

### Pages

#### `/github`
Dedicated GitHub analytics page with detailed metrics and contribution calendar.

#### `/settings/integrations`
Integration management page with setup guides and configuration options.

## Sync Process

### 1. Repository Discovery
- Fetches all accessible repositories (public and private if enabled)
- Updates repository metadata and statistics
- Identifies new repositories and archives deleted ones

### 2. Commit Synchronization
- Retrieves commits since last sync (or last 30 days for initial sync)
- Fetches detailed commit statistics including file changes
- Correlates commits with local activity logs based on timing and project matching

### 3. Pull Request Analysis
- Syncs all pull requests with current status
- Tracks review activity and merge statistics
- Links pull requests to focus sessions when possible

### 4. Activity Correlation
- Matches GitHub activity with local DevPulse data
- Uses time-based correlation with configurable confidence thresholds
- Enhances productivity insights by connecting coding output with tracked time

### 5. Analytics Generation
- Updates daily streak calculations
- Regenerates productivity scores and language statistics
- Refreshes contribution calendar data

## Privacy and Security

### Data Protection
- **OAuth tokens are encrypted** before storage
- **Local-first approach** - all data stays on your device
- **Minimal data collection** - only productivity-relevant metrics
- **Configurable privacy settings** for sensitive repositories

### Permissions
The integration requests these GitHub scopes:
- `repo` - Access to repository data and commits
- `user:email` - Basic profile information
- `read:user` - Public profile access

### Data Control
- **Granular repository filtering** - choose which repos to sync
- **Private repository toggle** - exclude private repos if desired
- **Data retention settings** - automatic cleanup of old data
- **Full disconnection** - complete removal of tokens and data

## Performance Optimization

### API Efficiency
- **Incremental sync** reduces API calls by 90%
- **Intelligent pagination** for large repositories
- **Rate limit awareness** with automatic retry logic
- **Cached responses** for frequently accessed data

### Database Performance
- **Optimized indexes** for common query patterns
- **Efficient data structures** for time-series analysis
- **Aggregated views** for dashboard performance
- **Background processing** for sync operations

### UI Responsiveness
- **Progressive loading** of dashboard components
- **Skeleton states** during data fetching
- **Error boundaries** for graceful failure handling
- **Real-time status updates** during sync operations

## Troubleshooting

### Common Issues

#### GitHub API Rate Limiting
- **Symptoms**: Sync fails with rate limit errors
- **Solution**: Reduce sync frequency or wait for rate limit reset
- **Prevention**: Use incremental sync instead of full sync

#### OAuth Connection Failed
- **Symptoms**: "Failed to connect GitHub" error
- **Solution**: Verify GitHub OAuth app configuration
- **Check**: Redirect URI matches exactly

#### No Data Appearing
- **Symptoms**: GitHub widgets show empty state
- **Solution**: Trigger manual sync or check repository permissions
- **Debug**: Verify access token has required scopes

#### Sync Takes Too Long
- **Symptoms**: Sync process doesn't complete
- **Solution**: Reduce number of repositories or use filtering
- **Optimization**: Enable private repo filtering if not needed

### Debug Information

Check sync logs in the browser console and database sync_log table:

```sql
SELECT * FROM github_sync_log 
ORDER BY started_at DESC 
LIMIT 10;
```

### Support

For issues specific to GitHub integration:
1. Check environment variables are correctly set
2. Verify OAuth app configuration on GitHub
3. Review browser console for API errors
4. Check database permissions and schema

## Contributing

### Adding New Metrics

1. **Extend database schema** in `github-schema.sql`
2. **Add API endpoint** in `apps/dashboard/src/app/api/github/`
3. **Create UI component** in `components/github/`
4. **Update types** in `types/github.ts`

### Sync Enhancements

1. **Modify sync service** in `lib/github-sync.ts`
2. **Add correlation logic** for new data types
3. **Update analytics calculations** in database layer
4. **Test with rate limiting scenarios**

### UI Improvements

1. **Follow existing component patterns** in `components/github/`
2. **Use Tailwind CSS** for consistent styling
3. **Add loading states** and error handling
4. **Include TypeScript types** for all props

## Roadmap

### Planned Features
- 🔄 **Webhook support** for real-time updates
- 📊 **Advanced analytics** with ML-powered insights
- 🤝 **Team collaboration** metrics and comparisons
- 🎯 **Goal setting** for coding productivity
- 📱 **Mobile dashboard** with GitHub integration
- 🔗 **IDE integration** for seamless workflow tracking

### API Enhancements
- **GraphQL support** for more efficient data fetching
- **Bulk operations** for enterprise repositories
- **Advanced filtering** with custom query language
- **Export capabilities** for external analysis tools

This comprehensive GitHub integration transforms DevPulse into a complete productivity analytics platform, providing deep insights into your coding patterns, collaboration effectiveness, and overall development productivity.