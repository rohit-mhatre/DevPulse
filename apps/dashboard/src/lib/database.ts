import Database from 'better-sqlite3';
import path from 'path';
import os from 'os';

export interface ActivityRecord {
  id?: number;
  started_at: string;
  activity_type: string;
  app_name: string;
  duration_seconds: number;
  project_id?: number;
  project_name?: string;
  project_path?: string;
}

export interface Project {
  id: number;
  name: string;
  path: string;
  created_at: string;
  updated_at: string;
}

export class DevPulseDatabase {
  private dbPath: string;

  constructor() {
    const userDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'DevPulse Desktop');
    this.dbPath = path.join(userDataPath, 'devpulse.db');
  }

  private getDatabase(): Database.Database {
    try {
      return new Database(this.dbPath);
    } catch (error) {
      throw new Error(`Database not found at ${this.dbPath}. Ensure DevPulse Desktop is installed and has recorded data.`);
    }
  }

  async getActivities(options: {
    startDate?: string;
    endDate?: string;
    activityTypes?: string[];
    projectIds?: number[];
    limit?: number;
  } = {}): Promise<ActivityRecord[]> {
    const db = this.getDatabase();
    
    try {
      let whereConditions = ['1=1'];
      let queryParams: any[] = [];

      // Date filtering
      if (options.startDate) {
        whereConditions.push('al.started_at >= ?');
        queryParams.push(options.startDate);
      }
      
      if (options.endDate) {
        const endDate = new Date(options.endDate);
        endDate.setHours(23, 59, 59, 999);
        whereConditions.push('al.started_at <= ?');
        queryParams.push(endDate.toISOString());
      }

      // Activity type filtering
      if (options.activityTypes && options.activityTypes.length > 0) {
        const placeholders = options.activityTypes.map(() => '?').join(',');
        whereConditions.push(`al.activity_type IN (${placeholders})`);
        queryParams.push(...options.activityTypes);
      }

      // Project filtering
      if (options.projectIds && options.projectIds.length > 0) {
        const placeholders = options.projectIds.map(() => '?').join(',');
        whereConditions.push(`al.project_id IN (${placeholders})`);
        queryParams.push(...options.projectIds);
      }

      const whereClause = whereConditions.join(' AND ');
      const limitClause = options.limit ? `LIMIT ${options.limit}` : '';

      const query = `
        SELECT 
          al.id,
          al.started_at,
          al.activity_type,
          al.app_name,
          al.duration_seconds,
          al.project_id,
          p.name as project_name,
          p.path as project_path
        FROM activity_logs al
        LEFT JOIN projects p ON al.project_id = p.id
        WHERE ${whereClause}
        ORDER BY al.started_at DESC
        ${limitClause}
      `;

      const activities = db.prepare(query).all(...queryParams) as ActivityRecord[];
      return activities;
    } finally {
      db.close();
    }
  }

  async getProjects(): Promise<Project[]> {
    const db = this.getDatabase();
    
    try {
      const projects = db.prepare(`
        SELECT * FROM projects
        ORDER BY updated_at DESC
      `).all() as Project[];
      
      return projects;
    } finally {
      db.close();
    }
  }

  async getDailyStats(date: string): Promise<{
    totalTime: number;
    activities: number;
    activeProjects: number;
    avgSessionTime: number;
    topApp: string;
    productivityScore: number;
  }> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const activities = await this.getActivities({
      startDate: startOfDay.toISOString(),
      endDate: endOfDay.toISOString()
    });

    const totalTime = activities.reduce((sum, a) => sum + a.duration_seconds, 0);
    const uniqueProjects = new Set(activities.map(a => a.project_id).filter(Boolean)).size;
    
    const appCounts = activities.reduce((acc: Record<string, number>, a) => {
      acc[a.app_name] = (acc[a.app_name] || 0) + 1;
      return acc;
    }, {});
    
    const topApp = Object.keys(appCounts).length > 0 
      ? Object.keys(appCounts).reduce((a, b) => appCounts[a] > appCounts[b] ? a : b)
      : '';

    return {
      totalTime,
      activities: activities.length,
      activeProjects: uniqueProjects,
      avgSessionTime: activities.length > 0 ? Math.floor(totalTime / activities.length) : 0,
      topApp,
      productivityScore: Math.min(Math.floor((totalTime / 28800) * 100), 100) // Out of 8 hours
    };
  }

  async getProductivityMetrics(options: {
    startDate: string;
    endDate: string;
    groupBy?: 'daily' | 'weekly' | 'monthly';
  }): Promise<any[]> {
    const activities = await this.getActivities({
      startDate: options.startDate,
      endDate: options.endDate
    });

    const productiveTypes = ['code', 'build', 'test', 'debug', 'research', 'design', 'document'];
    
    // Group activities by the specified period
    const grouped = this.groupActivitiesByPeriod(activities, options.groupBy || 'daily');

    return Object.entries(grouped).map(([period, periodActivities]) => {
      const totalTime = periodActivities.reduce((sum, a) => sum + a.duration_seconds, 0);
      const productiveTime = periodActivities
        .filter(a => productiveTypes.includes(a.activity_type))
        .reduce((sum, a) => sum + a.duration_seconds, 0);

      const productivityPercentage = totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 0;

      // Calculate top app and activity type
      const appCounts = periodActivities.reduce((acc: Record<string, number>, a) => {
        acc[a.app_name] = (acc[a.app_name] || 0) + a.duration_seconds;
        return acc;
      }, {});
      
      const activityTypeCounts = periodActivities.reduce((acc: Record<string, number>, a) => {
        acc[a.activity_type] = (acc[a.activity_type] || 0) + a.duration_seconds;
        return acc;
      }, {});

      const topApp = Object.keys(appCounts).length > 0 
        ? Object.keys(appCounts).reduce((a, b) => appCounts[a] > appCounts[b] ? a : b)
        : 'None';

      const topActivityType = Object.keys(activityTypeCounts).length > 0
        ? Object.keys(activityTypeCounts).reduce((a, b) => activityTypeCounts[a] > activityTypeCounts[b] ? a : b)
        : 'None';

      const uniqueProjects = new Set(periodActivities.map(a => a.project_id).filter(Boolean)).size;

      return {
        period,
        total_time_seconds: totalTime,
        total_time_hours: Math.round(totalTime / 3600 * 100) / 100,
        productive_time_seconds: productiveTime,
        productive_time_hours: Math.round(productiveTime / 3600 * 100) / 100,
        productivity_percentage: productivityPercentage,
        activity_count: periodActivities.length,
        top_activity_type: topActivityType,
        top_app: topApp,
        projects_worked: uniqueProjects,
        focus_score: this.calculateFocusScore(periodActivities, productivityPercentage)
      };
    }).sort((a, b) => a.period.localeCompare(b.period));
  }

  private groupActivitiesByPeriod(
    activities: ActivityRecord[], 
    groupBy: 'daily' | 'weekly' | 'monthly'
  ): Record<string, ActivityRecord[]> {
    const grouped: Record<string, ActivityRecord[]> = {};

    activities.forEach(activity => {
      const date = new Date(activity.started_at);
      let periodKey: string;

      switch (groupBy) {
        case 'daily':
          periodKey = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          periodKey = weekStart.toISOString().split('T')[0];
          break;
        case 'monthly':
          periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          break;
        default:
          periodKey = date.toISOString().split('T')[0];
      }

      if (!grouped[periodKey]) {
        grouped[periodKey] = [];
      }
      grouped[periodKey].push(activity);
    });

    return grouped;
  }

  private calculateFocusScore(activities: ActivityRecord[], productivityPercentage: number): number {
    if (activities.length === 0) return 0;

    let score = productivityPercentage;

    // Bonus for consistent activity (less context switching)
    const uniqueApps = new Set(activities.map(a => a.app_name)).size;
    const appConsistencyBonus = Math.max(0, 10 - uniqueApps);

    // Bonus for longer sessions (less fragmentation)
    const averageSessionLength = activities.reduce((sum, a) => sum + a.duration_seconds, 0) / activities.length;
    const sessionLengthBonus = averageSessionLength > 600 ? 5 : 0;

    return Math.min(100, Math.round(score + appConsistencyBonus + sessionLengthBonus));
  }

  async isAvailable(): Promise<boolean> {
    try {
      const db = this.getDatabase();
      db.close();
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton instance
export const devPulseDB = new DevPulseDatabase();