export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

export interface LogContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  component?: string;
  operation?: string;
  projectId?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  startTime: Date;
  endTime: Date;
  context?: LogContext;
  metadata?: Record<string, any>;
}

export interface SecurityEvent {
  type: 'authentication' | 'authorization' | 'data_access' | 'permission_change' | 'suspicious_activity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details: Record<string, any>;
  timestamp: Date;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableDatabase: boolean;
  filePath?: string;
  maxFiles?: string;
  maxSize?: string;
  datePattern?: string;
  format?: 'json' | 'simple' | 'detailed';
  context?: Partial<LogContext>;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context: LogContext;
  error?: Error;
  stack?: string;
  metadata?: Record<string, any>;
}