import { DevPulseLogger } from '../logger/logger';
import { SecurityEvent } from '../logger/types';
import {
  DevPulseError,
  ErrorHandler,
  ErrorContext,
  ErrorHandlingResult,
  RetryConfig,
  ErrorCategory,
  ErrorSeverity
} from './types';

// Re-export DevPulseError for convenience
export { DevPulseError } from './types';

export class ErrorManager {
  private logger: DevPulseLogger;
  private handlers: ErrorHandler[] = [];
  private errorCounts: Map<string, number> = new Map();
  private lastErrors: Map<string, Date> = new Map();
  private retryConfigs: Map<ErrorCategory, RetryConfig> = new Map();

  constructor(logger: DevPulseLogger) {
    this.logger = logger;
    this.setupDefaultRetryConfigs();
    this.setupDefaultHandlers();
  }

  private setupDefaultRetryConfigs(): void {
    this.retryConfigs.set(ErrorCategory.NETWORK, {
      maxAttempts: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      exponentialBase: 2,
      jitter: true
    });

    this.retryConfigs.set(ErrorCategory.DATABASE, {
      maxAttempts: 3,
      baseDelayMs: 500,
      maxDelayMs: 5000,
      exponentialBase: 2,
      jitter: true
    });

    this.retryConfigs.set(ErrorCategory.EXTERNAL_API, {
      maxAttempts: 3,
      baseDelayMs: 2000,
      maxDelayMs: 30000,
      exponentialBase: 2,
      jitter: true
    });

    this.retryConfigs.set(ErrorCategory.FILESYSTEM, {
      maxAttempts: 2,
      baseDelayMs: 100,
      maxDelayMs: 1000,
      exponentialBase: 2,
      jitter: false
    });
  }

  private setupDefaultHandlers(): void {
    // Network error handler
    this.addHandler({
      canHandle: (error) => {
        return error instanceof DevPulseError && error.category === ErrorCategory.NETWORK;
      },
      handle: async (error, context) => {
        const devPulseError = error as DevPulseError;
        
        // Log network connectivity issues
        this.logger.warn('Network error occurred', context, {
          errorCode: devPulseError.code,
          retryable: devPulseError.retryable
        });

        // Check if we're in offline mode
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          return {
            handled: true,
            recovered: false,
            shouldRetry: false,
            message: 'Application is offline. Will retry when connection is restored.'
          };
        }

        return {
          handled: true,
          recovered: false,
          shouldRetry: devPulseError.retryable,
          message: devPulseError.userMessage
        };
      }
    });

    // Database error handler
    this.addHandler({
      canHandle: (error) => {
        return error instanceof DevPulseError && error.category === ErrorCategory.DATABASE;
      },
      handle: async (error, context) => {
        const devPulseError = error as DevPulseError;
        
        this.logger.error('Database error occurred', devPulseError.originalError, context, {
          errorCode: devPulseError.code,
          retryable: devPulseError.retryable
        });

        // Check if it's a database lock error (common in SQLite)
        if (devPulseError.message.includes('database is locked') || 
            devPulseError.message.includes('SQLITE_BUSY')) {
          return {
            handled: true,
            recovered: false,
            shouldRetry: true,
            message: 'Database is busy. Retrying...'
          };
        }

        // Check if it's a corruption error
        if (devPulseError.message.includes('database disk image is malformed') ||
            devPulseError.message.includes('SQLITE_CORRUPT')) {
          
          this.logger.fatal('Database corruption detected', devPulseError.originalError, context);
          
          return {
            handled: true,
            recovered: false,
            shouldRetry: false,
            message: 'Database corruption detected. Please restart the application.'
          };
        }

        return {
          handled: true,
          recovered: false,
          shouldRetry: devPulseError.retryable,
          message: devPulseError.userMessage
        };
      }
    });

    // Permission error handler
    this.addHandler({
      canHandle: (error) => {
        return error instanceof DevPulseError && error.category === ErrorCategory.PERMISSION;
      },
      handle: async (error, context) => {
        const devPulseError = error as DevPulseError;
        
        this.logger.warn('Permission error occurred', context, {
          errorCode: devPulseError.code,
          resource: devPulseError.technicalDetails?.resource
        });

        // Log as security event
        this.logger.logSecurity({
          type: 'authorization',
          severity: 'medium',
          userId: context.userId,
          details: {
            resource: devPulseError.technicalDetails?.resource,
            operation: context.operation,
            error: devPulseError.message
          },
          timestamp: new Date()
        });

        return {
          handled: true,
          recovered: false,
          shouldRetry: false,
          message: devPulseError.userMessage
        };
      }
    });

    // Validation error handler
    this.addHandler({
      canHandle: (error) => {
        return error instanceof DevPulseError && error.category === ErrorCategory.VALIDATION;
      },
      handle: async (error, context) => {
        const devPulseError = error as DevPulseError;
        
        this.logger.info('Validation error occurred', context, {
          errorCode: devPulseError.code,
          field: devPulseError.technicalDetails?.field
        });

        return {
          handled: true,
          recovered: true,
          shouldRetry: false,
          message: devPulseError.userMessage
        };
      }
    });
  }

  public addHandler(handler: ErrorHandler): void {
    this.handlers.push(handler);
  }

  public removeHandler(handler: ErrorHandler): void {
    const index = this.handlers.indexOf(handler);
    if (index > -1) {
      this.handlers.splice(index, 1);
    }
  }

  public setRetryConfig(category: ErrorCategory, config: RetryConfig): void {
    this.retryConfigs.set(category, config);
  }

  public async handleError(
    error: Error | DevPulseError,
    context: Partial<ErrorContext> = {}
  ): Promise<ErrorHandlingResult> {
    const enrichedContext: ErrorContext = {
      timestamp: new Date(),
      ...context
    };

    // Convert to DevPulseError if needed
    let devPulseError: DevPulseError;
    if (error instanceof DevPulseError) {
      devPulseError = error;
    } else {
      devPulseError = this.categorizeError(error, enrichedContext);
    }

    // Track error frequency
    this.trackErrorFrequency(devPulseError);

    // Log the error
    this.logError(devPulseError, enrichedContext);

    // Find a handler
    for (const handler of this.handlers) {
      if (handler.canHandle(devPulseError)) {
        try {
          const result = await handler.handle(devPulseError, enrichedContext);
          
          if (result.handled) {
            this.logger.debug('Error handled successfully', enrichedContext, {
              errorCode: devPulseError.code,
              recovered: result.recovered,
              shouldRetry: result.shouldRetry
            });
            
            return result;
          }
        } catch (handlerError) {
          this.logger.error('Error handler failed', handlerError as Error, enrichedContext, {
            originalError: devPulseError.code,
            handlerError: (handlerError as Error).message
          });
        }
      }
    }

    // No handler found, provide default response
    return {
      handled: false,
      recovered: false,
      shouldRetry: devPulseError.retryable,
      message: devPulseError.userMessage
    };
  }

  public async retryWithBackoff<T>(
    operation: () => Promise<T>,
    category: ErrorCategory,
    context: Partial<ErrorContext> = {}
  ): Promise<T> {
    const config = this.retryConfigs.get(category) || {
      maxAttempts: 1,
      baseDelayMs: 0,
      maxDelayMs: 0,
      exponentialBase: 1,
      jitter: false
    };

    let lastError: Error;
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        this.logger.debug(`Attempt ${attempt}/${config.maxAttempts} for operation`, context);
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === config.maxAttempts) {
          break;
        }

        // Calculate delay
        const delay = Math.min(
          config.baseDelayMs * Math.pow(config.exponentialBase, attempt - 1),
          config.maxDelayMs
        );

        const finalDelay = config.jitter 
          ? delay + (Math.random() * delay * 0.1) // Add up to 10% jitter
          : delay;

        this.logger.debug(`Retrying in ${finalDelay}ms`, context, {
          attempt,
          maxAttempts: config.maxAttempts,
          error: (error as Error).message
        });

        await this.sleep(finalDelay);
      }
    }

    throw lastError!;
  }

  private categorizeError(error: Error, context: ErrorContext): DevPulseError {
    // Network errors
    if (error.message.includes('ENOTFOUND') || 
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('fetch')) {
      return DevPulseError.network(error.message, context, { originalError: error });
    }

    // Database errors
    if (error.message.includes('SQLITE') || 
        error.message.includes('database') ||
        error.message.includes('SQL')) {
      return DevPulseError.database(error.message, context, { originalError: error });
    }

    // File system errors
    if (error.message.includes('ENOENT') ||
        error.message.includes('EACCES') ||
        error.message.includes('EPERM')) {
      return DevPulseError.permission(error.message, undefined, context, { originalError: error });
    }

    // Default categorization
    return DevPulseError.fromError(error, ErrorCategory.SYSTEM, context, {
      severity: ErrorSeverity.MEDIUM,
      isRecoverable: false,
      retryable: false,
      userMessage: 'An unexpected error occurred'
    });
  }

  private trackErrorFrequency(error: DevPulseError): void {
    const key = `${error.category}:${error.code}`;
    const count = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, count + 1);
    this.lastErrors.set(key, new Date());

    // Alert on high error frequency
    if (count > 10) {
      this.logger.warn('High error frequency detected', error.context, {
        errorKey: key,
        count: count + 1,
        category: error.category,
        code: error.code
      });
    }
  }

  private logError(error: DevPulseError, context: ErrorContext): void {
    const logMethod = error.severity === ErrorSeverity.CRITICAL || error.severity === ErrorSeverity.HIGH 
      ? 'error' 
      : 'warn';

    this.logger[logMethod](
      `${error.category} error: ${error.message}`,
      error.originalError,
      context,
      {
        errorCode: error.code,
        severity: error.severity,
        category: error.category,
        isRecoverable: error.isRecoverable,
        retryable: error.retryable,
        userMessage: error.userMessage,
        technicalDetails: error.technicalDetails
      }
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public getErrorStats(): {
    totalErrors: number;
    errorsByCategory: Record<string, number>;
    recentErrors: Array<{ key: string; count: number; lastOccurrence: Date }>;
  } {
    const errorsByCategory: Record<string, number> = {};
    let totalErrors = 0;

    for (const [key, count] of this.errorCounts.entries()) {
      const category = key.split(':')[0];
      errorsByCategory[category] = (errorsByCategory[category] || 0) + count;
      totalErrors += count;
    }

    const recentErrors = Array.from(this.errorCounts.entries())
      .map(([key, count]) => ({
        key,
        count,
        lastOccurrence: this.lastErrors.get(key) || new Date(0)
      }))
      .sort((a, b) => b.lastOccurrence.getTime() - a.lastOccurrence.getTime())
      .slice(0, 20);

    return {
      totalErrors,
      errorsByCategory,
      recentErrors
    };
  }

  public clearErrorStats(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }
}