export enum ErrorCategory {
  NETWORK = 'network',
  DATABASE = 'database',
  FILESYSTEM = 'filesystem',
  PERMISSION = 'permission',
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  EXTERNAL_API = 'external_api',
  IPC = 'ipc',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  component?: string;
  operation?: string;
  projectId?: string;
  timestamp: Date;
  userAgent?: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

export interface ErrorDetails {
  category: ErrorCategory;
  severity: ErrorSeverity;
  code: string;
  message: string;
  originalError?: Error;
  context: ErrorContext;
  isRecoverable: boolean;
  retryable: boolean;
  userMessage: string;
  technicalDetails?: Record<string, any>;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  exponentialBase: number;
  jitter: boolean;
}

export interface ErrorHandler {
  canHandle(error: Error | DevPulseError): boolean;
  handle(error: Error | DevPulseError, context: ErrorContext): Promise<ErrorHandlingResult>;
}

export interface ErrorHandlingResult {
  handled: boolean;
  recovered: boolean;
  shouldRetry: boolean;
  message?: string;
  metadata?: Record<string, any>;
}

export class DevPulseError extends Error {
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly code: string;
  public readonly context: ErrorContext;
  public readonly isRecoverable: boolean;
  public readonly retryable: boolean;
  public readonly userMessage: string;
  public readonly technicalDetails?: Record<string, any>;
  public readonly originalError?: Error;

  constructor(details: ErrorDetails) {
    super(details.message);
    
    this.name = 'DevPulseError';
    this.category = details.category;
    this.severity = details.severity;
    this.code = details.code;
    this.context = details.context;
    this.isRecoverable = details.isRecoverable;
    this.retryable = details.retryable;
    this.userMessage = details.userMessage;
    this.technicalDetails = details.technicalDetails;
    this.originalError = details.originalError;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DevPulseError);
    }

    // Include original error stack if available
    if (details.originalError?.stack) {
      this.stack = `${this.stack}\nCaused by: ${details.originalError.stack}`;
    }
  }

  public static fromError(
    error: Error,
    category: ErrorCategory,
    context: Partial<ErrorContext> = {},
    options: {
      severity?: ErrorSeverity;
      code?: string;
      isRecoverable?: boolean;
      retryable?: boolean;
      userMessage?: string;
      technicalDetails?: Record<string, any>;
    } = {}
  ): DevPulseError {
    return new DevPulseError({
      category,
      severity: options.severity || ErrorSeverity.MEDIUM,
      code: options.code || `${category.toUpperCase()}_ERROR`,
      message: error.message,
      originalError: error,
      context: {
        timestamp: new Date(),
        ...context
      },
      isRecoverable: options.isRecoverable ?? false,
      retryable: options.retryable ?? false,
      userMessage: options.userMessage || 'An unexpected error occurred',
      technicalDetails: options.technicalDetails
    });
  }

  public static network(
    message: string,
    context: Partial<ErrorContext> = {},
    options: {
      code?: string;
      retryable?: boolean;
      userMessage?: string;
      originalError?: Error;
    } = {}
  ): DevPulseError {
    return new DevPulseError({
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      code: options.code || 'NETWORK_ERROR',
      message,
      originalError: options.originalError,
      context: {
        timestamp: new Date(),
        ...context
      },
      isRecoverable: true,
      retryable: options.retryable ?? true,
      userMessage: options.userMessage || 'Network connection error. Please check your internet connection.',
      technicalDetails: { networkError: true }
    });
  }

  public static database(
    message: string,
    context: Partial<ErrorContext> = {},
    options: {
      code?: string;
      severity?: ErrorSeverity;
      retryable?: boolean;
      userMessage?: string;
      originalError?: Error;
    } = {}
  ): DevPulseError {
    return new DevPulseError({
      category: ErrorCategory.DATABASE,
      severity: options.severity || ErrorSeverity.HIGH,
      code: options.code || 'DATABASE_ERROR',
      message,
      originalError: options.originalError,
      context: {
        timestamp: new Date(),
        ...context
      },
      isRecoverable: true,
      retryable: options.retryable ?? true,
      userMessage: options.userMessage || 'Database operation failed. Please try again.',
      technicalDetails: { databaseError: true }
    });
  }

  public static validation(
    message: string,
    field?: string,
    context: Partial<ErrorContext> = {},
    options: {
      code?: string;
      userMessage?: string;
    } = {}
  ): DevPulseError {
    return new DevPulseError({
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      code: options.code || 'VALIDATION_ERROR',
      message,
      context: {
        timestamp: new Date(),
        ...context
      },
      isRecoverable: true,
      retryable: false,
      userMessage: options.userMessage || message,
      technicalDetails: { field, validationError: true }
    });
  }

  public static permission(
    message: string,
    resource?: string,
    context: Partial<ErrorContext> = {},
    options: {
      code?: string;
      userMessage?: string;
      originalError?: Error;
    } = {}
  ): DevPulseError {
    return new DevPulseError({
      category: ErrorCategory.PERMISSION,
      severity: ErrorSeverity.HIGH,
      code: options.code || 'PERMISSION_ERROR',
      message,
      originalError: options.originalError,
      context: {
        timestamp: new Date(),
        ...context
      },
      isRecoverable: false,
      retryable: false,
      userMessage: options.userMessage || 'Permission denied. Please check your access rights.',
      technicalDetails: { resource, permissionError: true }
    });
  }
}