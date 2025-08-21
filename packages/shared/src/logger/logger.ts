import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { LogLevel, LogContext, PerformanceMetric, SecurityEvent, LoggerConfig, LogEntry } from './types';

export class DevPulseLogger {
  private winston: winston.Logger;
  private config: LoggerConfig;
  private performanceMetrics: PerformanceMetric[] = [];
  private securityEvents: SecurityEvent[] = [];

  constructor(config: LoggerConfig) {
    const defaults = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: true,
      enableDatabase: false,
      maxFiles: '14d',
      maxSize: '20m',
      datePattern: 'YYYY-MM-DD',
      format: 'detailed' as const
    };
    
    this.config = { ...defaults, ...config };

    this.winston = this.createWinstonLogger();
  }

  private createWinstonLogger(): winston.Logger {
    const transports: winston.transport[] = [];

    // Console transport
    if (this.config.enableConsole) {
      transports.push(new winston.transports.Console({
        level: this.config.level,
        format: this.getConsoleFormat()
      }));
    }

    // File transport with rotation
    if (this.config.enableFile && this.config.filePath) {
      transports.push(new DailyRotateFile({
        filename: this.config.filePath.replace('.log', '-%DATE%.log'),
        datePattern: this.config.datePattern,
        maxSize: this.config.maxSize,
        maxFiles: this.config.maxFiles,
        level: this.config.level,
        format: this.getFileFormat()
      }));

      // Separate error log file
      transports.push(new DailyRotateFile({
        filename: this.config.filePath.replace('.log', '-error-%DATE%.log'),
        datePattern: this.config.datePattern,
        maxSize: this.config.maxSize,
        maxFiles: this.config.maxFiles,
        level: LogLevel.ERROR,
        format: this.getFileFormat()
      }));
    }

    return winston.createLogger({
      level: this.config.level,
      transports,
      exitOnError: false,
      handleExceptions: true,
      handleRejections: true
    });
  }

  private getConsoleFormat(): winston.Logform.Format {
    if (process.env.NODE_ENV === 'development') {
      return winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }: any) => {
          const contextStr = meta.context ? ` [${meta.context.component || 'unknown'}]` : '';
          const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} ${level}${contextStr}: ${message}${metaStr}`;
        })
      );
    }

    return winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    );
  }

  private getFileFormat(): winston.Logform.Format {
    return winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.json()
    );
  }

  private enrichContext(context?: Partial<LogContext>): LogContext {
    return {
      timestamp: new Date(),
      ...this.config.context,
      ...context
    };
  }

  public debug(message: string, context?: Partial<LogContext>, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, context, metadata);
  }

  public info(message: string, context?: Partial<LogContext>, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, context, metadata);
  }

  public warn(message: string, context?: Partial<LogContext>, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, context, metadata);
  }

  public error(message: string, error?: Error, context?: Partial<LogContext>, metadata?: Record<string, any>): void {
    this.log(LogLevel.ERROR, message, context, { ...metadata, error: error?.message, stack: error?.stack });
  }

  public fatal(message: string, error?: Error, context?: Partial<LogContext>, metadata?: Record<string, any>): void {
    this.log(LogLevel.FATAL, message, context, { ...metadata, error: error?.message, stack: error?.stack });
  }

  private log(level: LogLevel, message: string, context?: Partial<LogContext>, metadata?: Record<string, any>): void {
    const enrichedContext = this.enrichContext(context);
    
    this.winston.log(level, message, {
      context: enrichedContext,
      ...metadata
    });
  }

  public logPerformance(metric: PerformanceMetric): void {
    this.performanceMetrics.push(metric);
    
    this.info(`Performance: ${metric.operation} completed in ${metric.duration}ms`, metric.context, {
      performance: metric,
      type: 'performance_metric'
    });

    // Keep only last 1000 metrics in memory
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000);
    }
  }

  public logSecurity(event: SecurityEvent): void {
    this.securityEvents.push(event);
    
    const level = event.severity === 'critical' || event.severity === 'high' ? LogLevel.ERROR : LogLevel.WARN;
    
    this.log(level, `Security Event: ${event.type}`, 
      { 
        userId: event.userId,
        component: 'security'
      },
      {
        security: event,
        type: 'security_event'
      }
    );

    // Keep only last 500 security events in memory
    if (this.securityEvents.length > 500) {
      this.securityEvents = this.securityEvents.slice(-500);
    }
  }

  public startTimer(operation: string, context?: Partial<LogContext>): () => void {
    const startTime = new Date();
    const enrichedContext = this.enrichContext(context);

    this.debug(`Starting operation: ${operation}`, enrichedContext);

    return () => {
      const endTime = new Date();
      const duration = endTime.getTime() - startTime.getTime();

      this.logPerformance({
        operation,
        duration,
        startTime,
        endTime,
        context: enrichedContext
      });
    };
  }

  public async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    context?: Partial<LogContext>
  ): Promise<T> {
    const stopTimer = this.startTimer(operation, context);
    
    try {
      const result = await fn();
      stopTimer();
      return result;
    } catch (error) {
      stopTimer();
      this.error(`Operation ${operation} failed`, error as Error, context);
      throw error;
    }
  }

  public measure<T>(
    operation: string,
    fn: () => T,
    context?: Partial<LogContext>
  ): T {
    const stopTimer = this.startTimer(operation, context);
    
    try {
      const result = fn();
      stopTimer();
      return result;
    } catch (error) {
      stopTimer();
      this.error(`Operation ${operation} failed`, error as Error, context);
      throw error;
    }
  }

  public getPerformanceMetrics(operation?: string): PerformanceMetric[] {
    if (operation) {
      return this.performanceMetrics.filter(m => m.operation === operation);
    }
    return [...this.performanceMetrics];
  }

  public getSecurityEvents(type?: SecurityEvent['type']): SecurityEvent[] {
    if (type) {
      return this.securityEvents.filter(e => e.type === type);
    }
    return [...this.securityEvents];
  }

  public updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Recreate winston logger if transport settings changed
    if (newConfig.enableConsole !== undefined || 
        newConfig.enableFile !== undefined || 
        newConfig.level !== undefined) {
      this.winston.close();
      this.winston = this.createWinstonLogger();
    }
  }

  public setContext(context: Partial<LogContext>): void {
    this.config.context = { ...this.config.context, ...context };
  }

  public clearContext(): void {
    this.config.context = {};
  }

  public getLogEntries(): LogEntry[] {
    // This would be implemented if we were storing logs in memory
    // For now, logs are handled by winston transports
    return [];
  }

  public cleanup(): void {
    this.winston.close();
    this.performanceMetrics = [];
    this.securityEvents = [];
  }
}