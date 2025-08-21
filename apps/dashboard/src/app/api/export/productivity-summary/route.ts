import { NextRequest, NextResponse } from 'next/server';

interface ExportFilters {
  startDate?: string;
  endDate?: string;
  groupBy?: 'daily' | 'weekly' | 'monthly';
  format: 'csv' | 'json';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const filters: ExportFilters = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      groupBy: (searchParams.get('groupBy') as 'daily' | 'weekly' | 'monthly') || 'daily',
      format: (searchParams.get('format') as 'csv' | 'json') || 'json'
    };

    // Try to get data from desktop app's HTTP server
    let activities = [];
    try {
      const desktopUrl = `http://localhost:3001/api/activity`;
      const response = await fetch(desktopUrl, {
        signal: AbortController ? new AbortController().signal : undefined
      });

      if (!response.ok) {
        throw new Error('Desktop app server not available');
      }
      
      const data = await response.json();
      activities = data.activities || [];
    } catch (error) {
      return NextResponse.json(
        { error: 'Desktop app not available. Please ensure DevPulse Desktop is running.' },
        { status: 503 }
      );
    }

    // Set default date range if not provided (last 30 days)
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
    const startDate = filters.startDate ? new Date(filters.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Generate productivity metrics from activities
    const productivityData = generateProductivityMetrics(activities, filters.groupBy, startDate, endDate);

    // Calculate overall summary
    const overallSummary = {
      total_periods: productivityData.length,
      total_time_hours: Math.round(productivityData.reduce((sum, p) => sum + p.total_time_hours, 0) * 100) / 100,
      average_daily_hours: productivityData.length > 0 ? Math.round((productivityData.reduce((sum, p) => sum + p.total_time_hours, 0) / productivityData.length) * 100) / 100 : 0,
      overall_productivity_percentage: productivityData.length > 0 ? Math.round(
        productivityData.reduce((sum, p) => sum + p.productivity_percentage, 0) / productivityData.length
      ) : 0,
      average_focus_score: productivityData.length > 0 ? Math.round(
        productivityData.reduce((sum, p) => sum + p.focus_score, 0) / productivityData.length
      ) : 0,
      most_productive_period: productivityData.length > 0 ? productivityData.reduce((max, p) => 
        p.productivity_percentage > max.productivity_percentage ? p : max, 
        productivityData[0]
      ).period : 'N/A',
      total_activities: productivityData.reduce((sum, p) => sum + p.activity_count, 0),
      date_range: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0]
      },
      exported_at: new Date().toISOString()
    };

    // Return data based on format
    if (filters.format === 'csv') {
      const csvHeader = 'period,total_time_hours,productive_time_hours,productivity_percentage,activity_count,top_activity_type,top_app,projects_worked,focus_score';
      const csvRows = productivityData.map(row => 
        `"${row.period}",${row.total_time_hours},${row.productive_time_hours},${row.productivity_percentage},${row.activity_count},"${row.top_activity_type}","${row.top_app}",${row.projects_worked},${row.focus_score}`
      );
      const csvContent = [csvHeader, ...csvRows].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="devpulse-productivity-summary-${filters.groupBy}-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // JSON format
    return NextResponse.json({
      data: productivityData,
      summary: overallSummary,
      filters: {
        ...filters,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('Error exporting productivity summary:', error);
    return NextResponse.json(
      { error: 'Failed to export productivity summary' },
      { status: 500 }
    );
  }
}

function generateProductivityMetrics(activities: any[], groupBy: string, startDate: Date, endDate: Date) {
  // Group activities by the specified period
  const grouped = new Map();
  
  activities.forEach(activity => {
    const activityDate = new Date(activity.started_at || activity.timestamp);
    if (activityDate < startDate || activityDate > endDate) return;
    
    let period = '';
    if (groupBy === 'daily') {
      period = activityDate.toISOString().split('T')[0];
    } else if (groupBy === 'weekly') {
      const weekStart = new Date(activityDate);
      weekStart.setDate(activityDate.getDate() - activityDate.getDay());
      period = weekStart.toISOString().split('T')[0];
    } else { // monthly
      period = `${activityDate.getFullYear()}-${String(activityDate.getMonth() + 1).padStart(2, '0')}`;
    }
    
    if (!grouped.has(period)) {
      grouped.set(period, []);
    }
    grouped.get(period).push(activity);
  });
  
  // Calculate metrics for each period
  return Array.from(grouped.entries()).map(([period, activities]) => {
    const totalTime = activities.reduce((sum, a) => sum + (a.duration_seconds || 0), 0);
    const productiveActivities = activities.filter(a => 
      ['code', 'build', 'test', 'debug', 'research', 'design'].includes(a.activity_type)
    );
    const productiveTime = productiveActivities.reduce((sum, a) => sum + (a.duration_seconds || 0), 0);
    
    const appCounts = activities.reduce((acc, a) => {
      acc[a.app_name] = (acc[a.app_name] || 0) + 1;
      return acc;
    }, {});
    const topApp = Object.keys(appCounts).reduce((a, b) => appCounts[a] > appCounts[b] ? a : b, '');
    
    const typeCounts = activities.reduce((acc, a) => {
      acc[a.activity_type] = (acc[a.activity_type] || 0) + 1;
      return acc;
    }, {});
    const topActivityType = Object.keys(typeCounts).reduce((a, b) => typeCounts[a] > typeCounts[b] ? a : b, '');
    
    const projects = new Set(activities.map(a => a.project_name).filter(Boolean));
    
    return {
      period,
      total_time_seconds: totalTime,
      total_time_hours: Math.round(totalTime / 3600 * 100) / 100,
      productive_time_seconds: productiveTime,
      productive_time_hours: Math.round(productiveTime / 3600 * 100) / 100,
      productivity_percentage: totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 0,
      activity_count: activities.length,
      top_activity_type: topActivityType,
      top_app: topApp,
      projects_worked: projects.size,
      focus_score: Math.min(100, Math.round((productiveTime / 3600) * 25)) // Rough focus score
    };
  }).sort((a, b) => a.period.localeCompare(b.period));
}

