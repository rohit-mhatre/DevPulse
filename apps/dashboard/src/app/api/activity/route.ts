import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';

// This connects to the same database as the desktop app
export async function GET() {
  try {
    // Path to the desktop app's database
    // This matches the path used by the Electron app: app.getPath('userData')
    const userDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'DevPulse Desktop');
    const dbPath = path.join(userDataPath, 'devpulse.db');
    
    console.log('Attempting to connect to database at:', dbPath);
    
    let db;
    try {
      db = new Database(dbPath);
      console.log('Successfully connected to database');
    } catch (error) {
      // If database doesn't exist, return empty data
      console.log('Database connection failed:', error.message);
      console.log('Database path tried:', dbPath);
      return NextResponse.json({
        activities: [],
        projects: [],
        stats: {
          totalTime: 0,
          activities: 0,
          activeProjects: 0,
          avgSessionTime: 0,
          topApp: '',
          productivityScore: 0
        }
      });
    }

    // Get today's activities
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const activities = db.prepare(`
      SELECT 
        al.*,
        p.name as project_name,
        p.path as project_path
      FROM activity_logs al
      LEFT JOIN projects p ON al.project_id = p.id
      WHERE al.started_at >= ? AND al.started_at < ?
      ORDER BY al.started_at DESC
      LIMIT 100
    `).all(startOfDay.toISOString(), endOfDay.toISOString());

    // Get all projects
    const projects = db.prepare(`
      SELECT * FROM projects
      ORDER BY updated_at DESC
    `).all();

    // Calculate stats
    const totalTime = activities.reduce((sum: number, a: any) => sum + a.duration_seconds, 0);
    const uniqueProjects = new Set(activities.map((a: any) => a.project_id).filter(Boolean)).size;
    const appCounts = activities.reduce((acc: Record<string, number>, a: any) => {
      acc[a.app_name] = (acc[a.app_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topApp = Object.keys(appCounts).reduce((a, b) => appCounts[a] > appCounts[b] ? a : b, '') || '';

    const stats = {
      totalTime,
      activities: activities.length,
      activeProjects: uniqueProjects,
      avgSessionTime: activities.length > 0 ? Math.floor(totalTime / activities.length) : 0,
      topApp,
      productivityScore: Math.min(Math.floor((totalTime / 28800) * 100), 100) // Out of 8 hours
    };

    // Transform activities to match frontend interface
    const transformedActivities = activities.map((activity: any) => ({
      timestamp: new Date(activity.started_at).getTime(),
      activity_type: activity.activity_type || 'other',
      app_name: activity.app_name,
      duration_seconds: activity.duration_seconds,
      project_name: activity.project_name || null
    }));

    db.close();

    return NextResponse.json({
      activities: transformedActivities,
      projects,
      stats
    });

  } catch (error) {
    console.error('Error fetching activity data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch activity data' },
      { status: 500 }
    );
  }
}