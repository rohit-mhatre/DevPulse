import { DevPulseLogger } from '../logger/logger';
import { DevPulseError, ErrorCategory } from '../error/types';

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy'
}

export interface HealthCheck {
  name: string;
  description: string;
  check: () => Promise<HealthCheckResult>;
  timeout?: number;
  critical?: boolean;
}

export interface HealthCheckResult {
  status: HealthStatus;
  message?: string;
  responseTime: number;
  metadata?: Record<string, any>;
  error?: Error;
}

export interface SystemHealth {
  status: HealthStatus;
  timestamp: Date;
  checks: Record<string, HealthCheckResult>;
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    critical: number;
  };
}

export class HealthMonitor {
  private logger: DevPulseLogger;
  private checks: Map<string, HealthCheck> = new Map();
  private lastHealthCheck: SystemHealth | null = null;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private listeners: Array<(health: SystemHealth) => void> = [];

  constructor(logger: DevPulseLogger) {
    this.logger = logger;
    this.setupDefaultHealthChecks();
  }

  private setupDefaultHealthChecks(): void {
    // Memory usage check
    this.addHealthCheck({
      name: 'memory',
      description: 'System memory usage',
      check: async () => {
        const startTime = Date.now();
        
        try {
          const usage = process.memoryUsage();
          const heapUsed = usage.heapUsed / 1024 / 1024; // MB
          const heapTotal = usage.heapTotal / 1024 / 1024; // MB
          const usage_percentage = (heapUsed / heapTotal) * 100;

          let status = HealthStatus.HEALTHY;
          let message = `Heap usage: ${heapUsed.toFixed(2)}MB / ${heapTotal.toFixed(2)}MB (${usage_percentage.toFixed(1)}%)`;

          if (usage_percentage > 90) {
            status = HealthStatus.UNHEALTHY;
            message += ' - Critical memory usage';
          } else if (usage_percentage > 70) {
            status = HealthStatus.DEGRADED;
            message += ' - High memory usage';
          }

          return {
            status,
            message,
            responseTime: Date.now() - startTime,
            metadata: {
              heapUsed,
              heapTotal,
              usage_percentage,
              rss: usage.rss / 1024 / 1024,
              external: usage.external / 1024 / 1024
            }
          };
        } catch (error) {
          return {
            status: HealthStatus.UNHEALTHY,
            message: 'Failed to check memory usage',
            responseTime: Date.now() - startTime,
            error: error as Error
          };
        }
      }
    });

    // Database connection check (will be added by database implementations)
    this.addHealthCheck({
      name: 'database',
      description: 'Database connectivity',
      check: async () => {
        const startTime = Date.now();
        
        // This is a placeholder - actual implementations should override this
        return {
          status: HealthStatus.HEALTHY,
          message: 'Database check not implemented',
          responseTime: Date.now() - startTime
        };
      }
    });

    // Event loop lag check
    this.addHealthCheck({
      name: 'event_loop',
      description: 'Event loop responsiveness',
      check: async () => {
        const startTime = Date.now();
        
        return new Promise<HealthCheckResult>((resolve) => {
          const checkTime = Date.now();
          setImmediate(() => {
            const lag = Date.now() - checkTime;
            const responseTime = Date.now() - startTime;

            let status = HealthStatus.HEALTHY;
            let message = `Event loop lag: ${lag}ms`;

            if (lag > 1000) {
              status = HealthStatus.UNHEALTHY;
              message += ' - Severe event loop blocking';
            } else if (lag > 100) {
              status = HealthStatus.DEGRADED;
              message += ' - Event loop under pressure';
            }

            resolve({
              status,
              message,
              responseTime,
              metadata: { lag }
            });
          });
        });
      }
    });
  }

  public addHealthCheck(check: HealthCheck): void {
    this.checks.set(check.name, {
      timeout: 5000,
      critical: false,
      ...check
    });

    this.logger.debug(`Added health check: ${check.name}`, { component: 'health_monitor' });
  }

  public removeHealthCheck(name: string): void {
    this.checks.delete(name);
    this.logger.debug(`Removed health check: ${name}`, { component: 'health_monitor' });
  }

  public async performHealthCheck(): Promise<SystemHealth> {
    const startTime = Date.now();
    const timestamp = new Date();
    const results: Record<string, HealthCheckResult> = {};
    
    this.logger.debug('Starting health check', { component: 'health_monitor' });

    // Execute all health checks concurrently
    const checkPromises = Array.from(this.checks.entries()).map(async ([name, check]) => {
      try {
        const timeoutPromise = new Promise<HealthCheckResult>((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Health check '${name}' timed out after ${check.timeout}ms`));
          }, check.timeout);
        });

        const checkPromise = check.check();
        const result = await Promise.race([checkPromise, timeoutPromise]);
        
        results[name] = result;
        
        if (result.status !== HealthStatus.HEALTHY) {
          this.logger.warn(`Health check '${name}' failed`, { component: 'health_monitor' }, {
            status: result.status,
            message: result.message,
            error: result.error?.message
          });
        }
      } catch (error) {
        results[name] = {
          status: HealthStatus.UNHEALTHY,
          message: `Health check failed: ${(error as Error).message}`,
          responseTime: Date.now() - startTime,
          error: error as Error
        };

        this.logger.error(`Health check '${name}' threw error`, error as Error, { component: 'health_monitor' });
      }
    });

    await Promise.all(checkPromises);

    // Calculate overall health status
    const summary = {
      total: Object.keys(results).length,
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      critical: 0
    };

    let overallStatus = HealthStatus.HEALTHY;

    for (const [name, result] of Object.entries(results)) {
      const check = this.checks.get(name);
      
      switch (result.status) {
        case HealthStatus.HEALTHY:
          summary.healthy++;
          break;
        case HealthStatus.DEGRADED:
          summary.degraded++;
          if (overallStatus === HealthStatus.HEALTHY) {
            overallStatus = HealthStatus.DEGRADED;
          }
          break;
        case HealthStatus.UNHEALTHY:
          summary.unhealthy++;
          overallStatus = HealthStatus.UNHEALTHY;
          
          if (check?.critical) {
            summary.critical++;
          }
          break;
      }
    }

    const health: SystemHealth = {
      status: overallStatus,
      timestamp,
      checks: results,
      summary
    };

    this.lastHealthCheck = health;

    // Notify listeners
    this.listeners.forEach(listener => {
      try {
        listener(health);
      } catch (error) {
        this.logger.error('Health check listener error', error as Error, { component: 'health_monitor' });
      }
    });

    this.logger.info('Health check completed', { component: 'health_monitor' }, {
      status: overallStatus,
      duration: Date.now() - startTime,
      summary
    });

    return health;
  }

  public getLastHealthCheck(): SystemHealth | null {
    return this.lastHealthCheck;
  }

  public startMonitoring(intervalMs: number = 30000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        this.logger.error('Automated health check failed', error as Error, { component: 'health_monitor' });
      }
    }, intervalMs);

    this.logger.info(`Started health monitoring with ${intervalMs}ms interval`, { component: 'health_monitor' });
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.logger.info('Stopped health monitoring', { component: 'health_monitor' });
    }
  }

  public addListener(listener: (health: SystemHealth) => void): void {
    this.listeners.push(listener);
  }

  public removeListener(listener: (health: SystemHealth) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  public isHealthy(): boolean {
    return this.lastHealthCheck?.status === HealthStatus.HEALTHY;
  }

  public cleanup(): void {
    this.stopMonitoring();
    this.listeners = [];
    this.checks.clear();
    this.lastHealthCheck = null;
  }
}