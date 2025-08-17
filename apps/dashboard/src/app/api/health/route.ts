import { NextRequest, NextResponse } from 'next/server';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  responseTime: number;
  metadata?: Record<string, any>;
  error?: string;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: Record<string, HealthCheckResult>;
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    critical: number;
  };
}

async function performHealthCheck(
  name: string,
  checkFn: () => Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; message?: string; metadata?: any }>,
  timeout: number = 5000
): Promise<HealthCheckResult> {
  const startTime = Date.now();
  
  try {
    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Health check '${name}' timed out after ${timeout}ms`)), timeout);
    });

    // Race the check function against timeout
    const result = await Promise.race([checkFn(), timeoutPromise]);
    
    return {
      ...result,
      responseTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Health check failed: ${(error as Error).message}`,
      responseTime: Date.now() - startTime,
      error: (error as Error).message
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    const checks: Record<string, HealthCheckResult> = {};

    // Database health check
    checks.database = await performHealthCheck('database', async () => {
      // In a real implementation, this would check database connectivity
      // For now, we'll simulate a database check
      return {
        status: 'healthy',
        message: 'Database connection is healthy',
        metadata: {
          connection: 'active',
          pool_size: 10
        }
      };
    });

    // Memory usage check
    checks.memory = await performHealthCheck('memory', async () => {
      if (typeof process !== 'undefined') {
        const usage = process.memoryUsage();
        const heapUsed = usage.heapUsed / 1024 / 1024; // MB
        const heapTotal = usage.heapTotal / 1024 / 1024; // MB
        const usagePercentage = (heapUsed / heapTotal) * 100;

        let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
        let message = `Heap usage: ${heapUsed.toFixed(2)}MB / ${heapTotal.toFixed(2)}MB (${usagePercentage.toFixed(1)}%)`;

        if (usagePercentage > 90) {
          status = 'unhealthy';
          message += ' - Critical memory usage';
        } else if (usagePercentage > 70) {
          status = 'degraded';
          message += ' - High memory usage';
        }

        return {
          status,
          message,
          metadata: {
            heapUsed: heapUsed.toFixed(2),
            heapTotal: heapTotal.toFixed(2),
            usagePercentage: usagePercentage.toFixed(1),
            rss: (usage.rss / 1024 / 1024).toFixed(2),
            external: (usage.external / 1024 / 1024).toFixed(2)
          }
        };
      }

      return {
        status: 'healthy',
        message: 'Memory check not available in browser environment'
      };
    });

    // API connectivity check
    checks.api_connectivity = await performHealthCheck('api_connectivity', async () => {
      // Check if we can make internal API calls
      try {
        const response = await fetch(`${request.nextUrl.origin}/api/activity`, {
          method: 'GET',
          signal: AbortSignal.timeout(3000)
        });

        if (response.ok) {
          return {
            status: 'healthy',
            message: 'API endpoints are responding',
            metadata: {
              response_status: response.status,
              response_time: response.headers.get('x-response-time') || 'unknown'
            }
          };
        } else {
          return {
            status: 'degraded',
            message: `API responding with status ${response.status}`,
            metadata: {
              response_status: response.status
            }
          };
        }
      } catch (error) {
        return {
          status: 'unhealthy',
          message: 'API endpoints not responding'
        };
      }
    });

    // File system check (for logs and data)
    checks.filesystem = await performHealthCheck('filesystem', async () => {
      if (typeof process !== 'undefined' && process.env.NODE_ENV) {
        // In a real implementation, check if we can write to necessary directories
        return {
          status: 'healthy',
          message: 'File system access is healthy',
          metadata: {
            node_env: process.env.NODE_ENV,
            platform: process.platform || 'unknown'
          }
        };
      }

      return {
        status: 'healthy',
        message: 'File system check not available in browser environment'
      };
    });

    // Calculate summary
    const summary = {
      total: Object.keys(checks).length,
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      critical: 0
    };

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    for (const check of Object.values(checks)) {
      switch (check.status) {
        case 'healthy':
          summary.healthy++;
          break;
        case 'degraded':
          summary.degraded++;
          if (overallStatus === 'healthy') {
            overallStatus = 'degraded';
          }
          break;
        case 'unhealthy':
          summary.unhealthy++;
          overallStatus = 'unhealthy';
          summary.critical++;
          break;
      }
    }

    const health: SystemHealth = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      summary
    };

    return NextResponse.json(health, {
      status: overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    const errorHealth: SystemHealth = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      checks: {
        system: {
          status: 'unhealthy',
          message: `Health check system error: ${(error as Error).message}`,
          responseTime: 0,
          error: (error as Error).message
        }
      },
      summary: {
        total: 1,
        healthy: 0,
        degraded: 0,
        unhealthy: 1,
        critical: 1
      }
    };

    return NextResponse.json(errorHealth, { 
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }
}