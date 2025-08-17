import { NextRequest, NextResponse } from 'next/server';

interface FocusSession {
  id: string;
  type: 'deep-work' | 'code-review' | 'learning' | 'meeting-prep';
  duration: number;
  startTime: string;
  endTime: string;
  focusScore: number;
  completed: boolean;
  distractions: number;
}

interface ExportFilters {
  startDate?: string;
  endDate?: string;
  sessionTypes?: string[];
  format: 'csv' | 'json';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const filters: ExportFilters = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      sessionTypes: searchParams.get('sessionTypes')?.split(',') || undefined,
      format: (searchParams.get('format') as 'csv' | 'json') || 'json'
    };

    // Note: Focus sessions are stored in localStorage in the browser
    // For server-side export, we need to work with what's available
    // In a real implementation, focus sessions should be stored in the database
    
    // Since focus sessions are stored in localStorage, we'll return instructions
    // for the frontend to handle the export, or implement a database storage solution
    
    // For now, return a structured response that can be used by frontend
    return NextResponse.json({
      message: 'Focus sessions are stored locally in your browser. Use the dashboard export feature to download your session data.',
      instructions: {
        export_endpoint: '/api/export/focus-sessions',
        supported_formats: ['csv', 'json'],
        filters: {
          startDate: 'YYYY-MM-DD format',
          endDate: 'YYYY-MM-DD format',
          sessionTypes: 'comma-separated list: deep-work,code-review,learning,meeting-prep',
          format: 'csv or json'
        }
      },
      sample_data_structure: {
        session_id: 'string',
        type: 'deep-work | code-review | learning | meeting-prep',
        start_time: 'ISO string',
        end_time: 'ISO string',
        duration_seconds: 'number',
        duration_minutes: 'number',
        completed: 'boolean',
        focus_score: 'number (0-100)',
        distractions: 'number',
        productivity_rating: 'string'
      }
    });

  } catch (error) {
    console.error('Error in focus sessions export:', error);
    return NextResponse.json(
      { error: 'Failed to process focus sessions export request' },
      { status: 500 }
    );
  }
}

// POST endpoint to receive focus session data from frontend for export
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = (searchParams.get('format') as 'csv' | 'json') || 'json';
    
    const body = await request.json();
    const { sessions, filters } = body;

    if (!sessions || !Array.isArray(sessions)) {
      return NextResponse.json(
        { error: 'Invalid session data provided' },
        { status: 400 }
      );
    }

    // Apply filters
    let filteredSessions = sessions;

    // Date filtering
    if (filters?.startDate) {
      const startDate = new Date(filters.startDate);
      filteredSessions = filteredSessions.filter((session: FocusSession) => 
        new Date(session.startTime) >= startDate
      );
    }

    if (filters?.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filteredSessions = filteredSessions.filter((session: FocusSession) => 
        new Date(session.startTime) <= endDate
      );
    }

    // Session type filtering
    if (filters?.sessionTypes && filters.sessionTypes.length > 0) {
      filteredSessions = filteredSessions.filter((session: FocusSession) =>
        filters.sessionTypes.includes(session.type)
      );
    }

    // Transform data for export
    const exportData = filteredSessions.map((session: FocusSession) => ({
      session_id: session.id,
      type: session.type,
      start_time: session.startTime,
      end_time: session.endTime,
      duration_seconds: session.duration,
      duration_minutes: Math.round(session.duration / 60 * 100) / 100,
      duration_hours: Math.round(session.duration / 3600 * 100) / 100,
      completed: session.completed,
      focus_score: session.focusScore,
      distractions: session.distractions,
      productivity_rating: session.focusScore >= 80 ? 'Excellent' : 
                          session.focusScore >= 60 ? 'Good' : 
                          session.focusScore >= 40 ? 'Fair' : 'Needs Improvement'
    }));

    // Add summary statistics
    const summary = {
      total_sessions: exportData.length,
      completed_sessions: exportData.filter(s => s.completed).length,
      total_focus_time_seconds: exportData.reduce((sum, s) => sum + s.duration_seconds, 0),
      total_focus_time_hours: Math.round(exportData.reduce((sum, s) => sum + s.duration_seconds, 0) / 3600 * 100) / 100,
      average_session_duration_minutes: Math.round(
        exportData.reduce((sum, s) => sum + s.duration_seconds, 0) / exportData.length / 60 * 100
      ) / 100,
      average_focus_score: Math.round(
        exportData.reduce((sum, s) => sum + s.focus_score, 0) / exportData.length * 100
      ) / 100,
      total_distractions: exportData.reduce((sum, s) => sum + s.distractions, 0),
      session_types_breakdown: {
        'deep-work': exportData.filter(s => s.type === 'deep-work').length,
        'code-review': exportData.filter(s => s.type === 'code-review').length,
        'learning': exportData.filter(s => s.type === 'learning').length,
        'meeting-prep': exportData.filter(s => s.type === 'meeting-prep').length
      },
      date_range: {
        start: filters?.startDate || (exportData.length > 0 ? exportData[exportData.length - 1].start_time : null),
        end: filters?.endDate || (exportData.length > 0 ? exportData[0].start_time : null)
      },
      exported_at: new Date().toISOString()
    };

    // Return data based on format
    if (format === 'csv') {
      const csvHeader = 'session_id,type,start_time,end_time,duration_seconds,duration_minutes,duration_hours,completed,focus_score,distractions,productivity_rating';
      const csvRows = exportData.map(row => 
        `"${row.session_id}","${row.type}","${row.start_time}","${row.end_time}",${row.duration_seconds},${row.duration_minutes},${row.duration_hours},${row.completed},${row.focus_score},${row.distractions},"${row.productivity_rating}"`
      );
      const csvContent = [csvHeader, ...csvRows].join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="devpulse-focus-sessions-export-${new Date().toISOString().split('T')[0]}.csv"`
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
    console.error('Error exporting focus session data:', error);
    return NextResponse.json(
      { error: 'Failed to export focus session data' },
      { status: 500 }
    );
  }
}