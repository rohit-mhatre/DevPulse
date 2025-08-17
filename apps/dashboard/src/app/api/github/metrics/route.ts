import { NextRequest, NextResponse } from 'next/server';
import { gitHubDB } from '@/lib/github-database';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const days = parseInt(searchParams.get('days') || '30');
    const metric = searchParams.get('metric') || 'overview';

    // Validate days parameter
    if (days < 1 || days > 365) {
      return NextResponse.json(
        { error: 'Days parameter must be between 1 and 365' },
        { status: 400 }
      );
    }

    switch (metric) {
      case 'overview':
        const productivityMetrics = await gitHubDB.getGitHubProductivityMetrics('default', days);
        return NextResponse.json(productivityMetrics);

      case 'activity':
        const activityWidget = await gitHubDB.getGitHubActivityWidget('default');
        return NextResponse.json(activityWidget);

      case 'calendar':
        const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
        const calendar = await gitHubDB.getGitHubContributionCalendar('default', year);
        return NextResponse.json(calendar);

      case 'repositories':
        const repositories = await gitHubDB.getGitHubRepositories('default');
        
        // Add some basic statistics
        const repoStats = repositories.map(repo => ({
          ...repo,
          // These would be calculated from commits/PRs data
          recentActivity: true, // Placeholder
          commitCount: 0, // Placeholder
          pullRequestCount: 0 // Placeholder
        }));

        return NextResponse.json(repoStats);

      case 'commits':
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const commits = await gitHubDB.getGitHubCommits({
          userId: 'default',
          startDate,
          limit: 100
        });

        return NextResponse.json(commits);

      case 'languages':
        // Get language statistics from repositories
        const repos = await gitHubDB.getGitHubRepositories('default');
        const languageStats = repos.reduce((acc, repo) => {
          if (repo.language) {
            acc[repo.language] = (acc[repo.language] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        const languageArray = Object.entries(languageStats)
          .map(([language, count]) => ({ language, repositories: count }))
          .sort((a, b) => b.repositories - a.repositories)
          .slice(0, 10);

        return NextResponse.json(languageArray);

      case 'streaks':
        // Get current and historical streak data
        const currentDate = new Date();
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(currentDate.getDate() - 90);

        // This would be implemented in GitHubDatabase
        const streakData = {
          currentStreak: 0,
          longestStreak: 0,
          totalContributions: 0,
          averageContributionsPerDay: 0
        };

        return NextResponse.json(streakData);

      default:
        return NextResponse.json(
          { error: 'Invalid metric type' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('GitHub metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch GitHub metrics' },
      { status: 500 }
    );
  }
}