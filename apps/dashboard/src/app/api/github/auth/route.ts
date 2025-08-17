import { NextRequest, NextResponse } from 'next/server';
import { GitHubOAuth, createGitHubAPI } from '@/lib/github-api';
import { gitHubDB } from '@/lib/github-database';

// GitHub OAuth configuration
const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    return NextResponse.redirect(
      `${request.nextUrl.origin}/settings/integrations?error=${encodeURIComponent(error)}`
    );
  }

  // Handle OAuth callback
  if (code) {
    try {
      // Exchange code for access token
      const tokenResponse = await GitHubOAuth.exchangeCodeForToken(
        code,
        GITHUB_CLIENT_ID,
        GITHUB_CLIENT_SECRET
      );

      // Get user information
      const githubAPI = createGitHubAPI(tokenResponse.access_token);
      const githubUser = await githubAPI.getCurrentUser();

      // Save GitHub settings
      await gitHubDB.saveGitHubSettings({
        userId: 'default', // For single-user desktop app
        username: githubUser.login,
        accessToken: tokenResponse.access_token, // Should be encrypted in production
        syncEnabled: true,
        syncFrequencyMinutes: 60,
        privateReposEnabled: true
      });

      // Initialize GitHub schema if needed
      try {
        await gitHubDB.initializeGitHubSchema();
      } catch (error) {
        console.log('GitHub schema already exists or error initializing:', error);
      }

      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings/integrations?success=github_connected`
      );
    } catch (error) {
      console.error('GitHub OAuth error:', error);
      return NextResponse.redirect(
        `${request.nextUrl.origin}/settings/integrations?error=oauth_failed`
      );
    }
  }

  // Start OAuth flow
  const authUrl = GitHubOAuth.getAuthUrl(
    GITHUB_CLIENT_ID,
    ['repo', 'user:email', 'read:user'],
    state || undefined
  );

  return NextResponse.redirect(authUrl);
}

export async function DELETE() {
  try {
    // Disconnect GitHub integration
    await gitHubDB.saveGitHubSettings({
      userId: 'default',
      syncEnabled: false,
      accessToken: undefined,
      refreshToken: undefined
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting GitHub:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect GitHub integration' },
      { status: 500 }
    );
  }
}