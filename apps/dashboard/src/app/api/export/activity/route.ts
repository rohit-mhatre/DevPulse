import { NextRequest, NextResponse } from 'next/server';
import { devPulseDB } from '@/lib/database';


interface ExportFilters {
  startDate?: string;
  endDate?: string;
  activityTypes?: string[];
  format: 'csv' | 'json';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const filters: ExportFilters = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      activityTypes: searchParams.get('activityTypes')?.split(',') || undefined,
      format: (searchParams.get('format') as 'csv' | 'json') || 'json'
    };

    // Try to get data from desktop app's HTTP server
    let activities = [];
    try {
      const desktopUrl = `http://localhost:3001/api/activity${filters.startDate ? `?date=${filters.startDate}` : ''}`;
      const response = await fetch(desktopUrl, {
        signal: AbortController ? new AbortController().signal : undefined
      });

      if (response.ok) {
        const data = await response.json();
        activities = data.activities || [];
        
        // Filter by date range if endDate is provided
        if (filters.endDate && filters.startDate !== filters.endDate) {
          const endDate = new Date(filters.endDate);
          activities = activities.filter(a => new Date(a.started_at) <= endDate);
        }
        
        // Filter by activity types if provided
        if (filters.activityTypes) {
          activities = activities.filter(a => filters.activityTypes.includes(a.activity_type));
        }
      } else {
        throw new Error('Desktop app server not available');
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Desktop app not available. Please ensure DevPulse Desktop is running.' },
        { status: 503 }
      );
    }

    // Transform data for export
    const exportData = activities.map((activity) => {
      // Calculate productivity score based on activity type
      let productivityScore = 50; // Default
      if (['code', 'build', 'test', 'debug'].includes(activity.activity_type)) {
        productivityScore = 95;
      } else if (['research', 'design', 'document'].includes(activity.activity_type)) {
        productivityScore = 85;
      } else if (['meeting', 'review'].includes(activity.activity_type)) {
        productivityScore = 75;
      } else if (activity.activity_type === 'browsing') {
        productivityScore = 40;
      }
      
      return {
        timestamp: activity.started_at,
        activity_type: activity.activity_type || 'other',
        app_name: activity.app_name,
        duration_seconds: activity.duration_seconds,
        duration_minutes: Math.round(activity.duration_seconds / 60 * 100) / 100,
        project_name: activity.project_name || 'Unknown',
        project_path: activity.project_path || '',
        productivity_score: productivityScore
      };
    });

    // Add summary statistics
    const summary = {
      total_records: exportData.length,
      total_time_seconds: exportData.reduce((sum, a) => sum + a.duration_seconds, 0),
      total_time_hours: Math.round(exportData.reduce((sum, a) => sum + a.duration_seconds, 0) / 3600 * 100) / 100,
      average_productivity_score: Math.round(
        exportData.reduce((sum, a) => sum + a.productivity_score, 0) / exportData.length * 100
      ) / 100,
      date_range: {
        start: filters.startDate || (exportData.length > 0 ? exportData[exportData.length - 1].timestamp : null),
        end: filters.endDate || (exportData.length > 0 ? exportData[0].timestamp : null)
      },
      exported_at: new Date().toISOString()
    };

    // Return data based on format
    if (filters.format === 'csv') {
      const csvHeader = 'timestamp,activity_type,app_name,duration_seconds,duration_minutes,project_name,project_path,productivity_score';
      const csvRows = exportData.map(row => 
        `"${row.timestamp}","${row.activity_type}","${row.app_name}",${row.duration_seconds},${row.duration_minutes},"${row.project_name}","${row.project_path}",${row.productivity_score}`
      );
      const csvContent = [csvHeader, ...csvRows].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="devpulse-activity-export-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // JSON format
    return NextResponse.json({
      data: exportData,
      summary,
      filters
    });

  } catch (error) {
    console.error('Error exporting activity data:', error);
    return NextResponse.json(
      { error: 'Failed to export activity data' },
      { status: 500 }
    );
  }
}