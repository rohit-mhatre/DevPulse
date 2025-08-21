import { NextResponse } from 'next/server';
import { devPulseDB } from '@/lib/database';
import { performanceMonitor } from '@/lib/performance-monitor';

interface ApiError extends Error {
  status?: number;
  code?: string;
  context?: Record<string, any>;
}

function createApiError(message: string, status: number = 500, code?: string, context?: Record<string, any>): ApiError {
  const error = new Error(message) as ApiError;
  error.status = status;
  error.code = code;
  error.context = context;
  return error;
}

function handleApiError(error: Error | ApiError, operation: string) {
  const isApiError = 'status' in error;
  const status = isApiError ? (error as ApiError).status || 500 : 500;
  const code = isApiError ? (error as ApiError).code : 'INTERNAL_ERROR';
  
  console.error(`API Error in ${operation}:`, {
    message: error.message,
    stack: error.stack,
    status,
    code,
    context: isApiError ? (error as ApiError).context : undefined,
    timestamp: new Date().toISOString()
  });

  // Determine user-friendly message based on error type
  let userMessage = 'An unexpected error occurred';
  if (error.message.includes('database') || error.message.includes('SQLITE')) {
    userMessage = 'Database connection error. Please ensure the desktop app is running.';
  } else if (error.message.includes('timeout')) {
    userMessage = 'Request timed out. Please try again.';
  } else if (error.message.includes('permission')) {
    userMessage = 'Permission denied. Please check your access rights.';
  }

  return NextResponse.json(
    {
      error: {
        message: userMessage,
        code,
        operation,
        timestamp: new Date().toISOString()
      }
    },
    { 
      status,
      headers: {
        'Cache-Control': 'no-cache',
        'X-Error-Code': code,
        'X-Error-Operation': operation
      }
    }
  );
}


// This connects to the same database as the desktop app
// Add simple in-memory cache with 30-second TTL
const cache = new Map();
const CACHE_TTL = 1000; // 1 second for real-time sync

export async function GET(request: Request) {
  const endTimer = performanceMonitor.startApiTimer('activity');
  const startTime = Date.now();
  
  // Parse URL parameters
  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  
  // Use provided date or default to today
  const targetDate = dateParam ? new Date(dateParam) : new Date();
  const cacheKey = `activity-data-${targetDate.toISOString().split('T')[0]}`;
  
  try {
    // Check cache first
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json({
        ...cached.data,
        metadata: {
          ...cached.data.metadata,
          source: 'cache',
          responseTime: Date.now() - startTime
        }
      }, {
        headers: {
          'Cache-Control': 'private, max-age=10',
          'X-Response-Time': (Date.now() - startTime).toString(),
          'X-Data-Source': 'cache'
        }
      });
    }

    // Try to get data from desktop app's HTTP server
    try {
      const desktopUrl = `http://localhost:3001/api/activity${dateParam ? `?date=${dateParam}` : ''}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(desktopUrl, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        
        // Cache the successful response
        cache.set(cacheKey, {
          data,
          timestamp: Date.now()
        });

        endTimer();
        return NextResponse.json(data, {
          headers: {
            'Cache-Control': 'private, max-age=5',
            'X-Response-Time': (Date.now() - startTime).toString(),
            'X-Data-Source': 'desktop-app',
            'X-Total-Time': data.stats?.totalTime?.toString() || '0'
          }
        });
      } else {
        throw new Error(`Desktop app server responded with ${response.status}`);
      }
    } catch (error) {
      console.log(`Desktop app server not available: ${error.message}`);
      // Fall back to direct database access if available
      const isDbAvailable = await devPulseDB.isAvailable();
      if (!isDbAvailable) {
        console.log('Database also not available - returning empty data');
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
          },
          metadata: {
            source: 'fallback',
            message: 'Desktop app and database not accessible',
            responseTime: Date.now() - startTime
          }
        }, {
          status: 200,
          headers: {
            'Cache-Control': 'no-cache',
            'X-Data-Source': 'fallback'
          }
        });
      }
    }

    // Get activities for the selected date with error handling and timeout
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    // Create timeout wrapper for database operations
    const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> => {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(createApiError(`${operation} timed out after ${timeoutMs}ms`, 503, 'OPERATION_TIMEOUT'));
        }, timeoutMs);
      });
      return Promise.race([promise, timeoutPromise]);
    };

    // Execute database operations in parallel with timeouts
    const [activities, projects, stats] = await Promise.allSettled([
      withTimeout(
        devPulseDB.getActivities({
          startDate: startOfDay.toISOString(),
          endDate: endOfDay.toISOString(),
          limit: 100
        }),
        5000,
        'Get activities'
      ),
      withTimeout(
        devPulseDB.getProjects(),
        3000,
        'Get projects'
      ),
      withTimeout(
        devPulseDB.getDailyStats(targetDate.toISOString().split('T')[0]),
        3000,
        'Get daily stats'
      )
    ]);

    // Handle partial failures gracefully
    const activitiesData = activities.status === 'fulfilled' ? activities.value : [];
    const projectsData = projects.status === 'fulfilled' ? projects.value : [];
    const statsData = stats.status === 'fulfilled' ? stats.value : {
      totalTime: 0,
      activities: 0,
      activeProjects: 0,
      avgSessionTime: 0,
      topApp: '',
      productivityScore: 0
    };

    // Log any failures
    const failures = [activities, projects, stats]
      .map((result, index) => ({ result, operation: ['activities', 'projects', 'stats'][index] }))
      .filter(({ result }) => result.status === 'rejected')
      .map(({ result, operation }) => ({ operation, error: (result as PromiseRejectedResult).reason }));

    if (failures.length > 0) {
      console.warn('Some database operations failed:', failures);
    }

    // Transform activities to match frontend interface with error handling
    const transformedActivities = activitiesData.map((activity) => {
      try {
        return {
          timestamp: new Date(activity.started_at).getTime(),
          activity_type: activity.activity_type || 'other',
          app_name: activity.app_name || 'Unknown',
          duration_seconds: activity.duration_seconds || 0,
          project_name: activity.project_name || null
        };
      } catch (error) {
        console.warn('Failed to transform activity:', activity, error);
        return {
          timestamp: Date.now(),
          activity_type: 'other',
          app_name: 'Unknown',
          duration_seconds: 0,
          project_name: null
        };
      }
    });

    const responseTime = Date.now() - startTime;

    const responseData = {
      activities: transformedActivities,
      projects: projectsData,
      stats: statsData,
      metadata: {
        source: 'database',
        responseTime,
        activitiesCount: transformedActivities.length,
        projectsCount: projectsData.length,
        hasFailures: failures.length > 0,
        failures: failures.map(f => ({ operation: f.operation, error: f.error.message }))
      }
    };

    // Cache the successful response
    cache.set(cacheKey, {
      data: responseData,
      timestamp: Date.now()
    });

    endTimer();
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'private, max-age=10',
        'X-Response-Time': responseTime.toString(),
        'X-Data-Source': 'database',
        'X-Activities-Count': transformedActivities.length.toString()
      }
    });

  } catch (error) {
    endTimer();
    return handleApiError(error as Error, 'GET /api/activity');
  }
}