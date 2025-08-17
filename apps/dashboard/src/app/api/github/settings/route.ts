import { NextRequest, NextResponse } from 'next/server';
import { gitHubDB } from '@/lib/github-database';
import { gitHubSync } from '@/lib/github-sync';

export async function GET() {
  try {
    const settings = await gitHubDB.getGitHubSettings('default');
    
    if (!settings) {
      return NextResponse.json({
        enabled: false,
        configured: false
      });
    }

    // Don't return sensitive tokens
    const safeSettings = {
      enabled: settings.syncEnabled,
      configured: !!settings.accessToken,
      username: settings.username,
      syncFrequencyMinutes: settings.syncFrequencyMinutes,
      privateReposEnabled: settings.privateReposEnabled,
      lastSyncAt: settings.lastSyncAt
    };

    return NextResponse.json(safeSettings);
  } catch (error) {
    console.error('Error getting GitHub settings:', error);
    return NextResponse.json(
      { error: 'Failed to get GitHub settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      syncEnabled, 
      syncFrequencyMinutes, 
      privateReposEnabled 
    } = body;

    // Get current settings
    const currentSettings = await gitHubDB.getGitHubSettings('default');
    if (!currentSettings) {
      return NextResponse.json(
        { error: 'GitHub integration not configured' },
        { status: 400 }
      );
    }

    // Update settings
    await gitHubDB.saveGitHubSettings({
      userId: 'default',
      username: currentSettings.username,
      accessToken: currentSettings.accessToken,
      syncEnabled: syncEnabled !== undefined ? syncEnabled : currentSettings.syncEnabled,
      syncFrequencyMinutes: syncFrequencyMinutes || currentSettings.syncFrequencyMinutes,
      privateReposEnabled: privateReposEnabled !== undefined ? privateReposEnabled : currentSettings.privateReposEnabled
    });

    // Reinitialize sync service with new settings
    if (syncEnabled) {
      await gitHubSync.initialize();
    } else {
      await gitHubSync.stopSync();
    }

    return NextResponse.json({
      success: true,
      message: 'GitHub settings updated successfully'
    });

  } catch (error) {
    console.error('Error updating GitHub settings:', error);
    return NextResponse.json(
      { error: 'Failed to update GitHub settings' },
      { status: 500 }
    );
  }
}