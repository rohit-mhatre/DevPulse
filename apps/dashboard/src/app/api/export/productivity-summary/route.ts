import { NextRequest, NextResponse } from 'next/server';
import { devPulseDB } from '@/lib/database';


interface DailyProductivity {
  date: string;
  total_time_seconds: number;
  total_time_hours: number;
  productive_time_seconds: number;
  productive_time_hours: number;
  productivity_percentage: number;
  activity_count: number;
  top_activity_type: string;
  top_app: string;
  projects_worked: number;
  focus_score: number;
}

interface WeeklyProductivity {
  week_start: string;
  week_end: string;
  total_time_hours: number;
  average_daily_hours: number;
  productivity_score: number;
  most_productive_day: string;
  total_sessions: number;
}

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

    // Check if database is available
    const isAvailable = await devPulseDB.isAvailable();
    if (!isAvailable) {
      return NextResponse.json(
        { error: 'Database not found. Ensure DevPulse Desktop is installed and has recorded data.' },
        { status: 404 }
      );
    }

    // Set default date range if not provided (last 30 days)
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();
    const startDate = filters.startDate ? new Date(filters.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Get productivity metrics using the database helper
    const productivityData = await devPulseDB.getProductivityMetrics({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      groupBy: filters.groupBy
    });


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

