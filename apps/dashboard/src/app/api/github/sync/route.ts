import { NextRequest, NextResponse } from 'next/server';
import { gitHubSync } from '@/lib/github-sync';
import { gitHubDB } from '@/lib/github-database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type = 'manual' } = body;

    // Validate sync type
    if (!['full', 'incremental', 'manual'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid sync type' },
        { status: 400 }
      );
    }

    // Check if GitHub is configured
    const settings = await gitHubDB.getGitHubSettings();
    if (!settings?.accessToken) {
      return NextResponse.json(
        { error: 'GitHub integration not configured' },
        { status: 400 }
      );
    }

    // Initialize and start sync
    await gitHubSync.initialize();
    const syncLogId = await gitHubSync.startSync(type);

    return NextResponse.json({
      success: true,
      syncLogId,
      message: `GitHub ${type} sync started successfully`
    });

  } catch (error) {
    console.error('GitHub sync error:', error);
    
    if (error instanceof Error && error.message === 'Sync is already running') {
      return NextResponse.json(
        { error: 'GitHub sync is already in progress' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to start GitHub sync' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get sync status
    const status = await gitHubSync.getSyncStatus();
    
    return NextResponse.json(status);
  } catch (error) {
    console.error('Error getting sync status:', error);
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    // Stop sync
    await gitHubSync.stopSync();
    
    return NextResponse.json({
      success: true,
      message: 'GitHub sync stopped'
    });
  } catch (error) {
    console.error('Error stopping sync:', error);
    return NextResponse.json(
      { error: 'Failed to stop sync' },
      { status: 500 }
    );
  }
}