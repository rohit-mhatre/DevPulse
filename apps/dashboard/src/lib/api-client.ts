interface ApiError extends Error {
  status?: number;
  statusText?: string;
  data?: any;
}

interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  retryCondition: (error: ApiError) => boolean;
}

interface RequestConfig extends RequestInit {
  timeout?: number;
  retries?: Partial<RetryConfig>;
}

class ApiClient {
  private baseURL: string;
  private defaultTimeout: number = 30000; // 30 seconds
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    retryDelay: 1000,
    retryCondition: (error) => {
      // Retry on network errors or 5xx server errors
      return !error.status || error.status >= 500;
    }
  };

  constructor(baseURL: string = '') {
    this.baseURL = baseURL;
  }

  private async createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  private async executeRequest(
    url: string, 
    config: RequestConfig = {}
  ): Promise<Response> {
    const {
      timeout = this.defaultTimeout,
      retries = {},
      ...fetchConfig
    } = config;

    const retryConfig = { ...this.defaultRetryConfig, ...retries };
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;

    // Add default headers
    const headers = {
      'Content-Type': 'application/json',
      ...config.headers
    };

    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const fetchPromise = fetch(fullUrl, {
          ...fetchConfig,
          headers
        });

        const timeoutPromise = this.createTimeoutPromise(timeout);
        const response = await Promise.race([fetchPromise, timeoutPromise]);

        if (!response.ok) {
          const error: ApiError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          error.status = response.status;
          error.statusText = response.statusText;
          
          try {
            error.data = await response.json();
          } catch {
            // Response is not JSON, ignore
          }

          throw error;
        }

        return response;
      } catch (error) {
        lastError = error as ApiError;
        
        console.error(`API request attempt ${attempt + 1} failed:`, {
          url: fullUrl,
          error: lastError.message,
          status: lastError.status
        });

        // If this is the last attempt or error is not retryable, throw
        if (attempt === retryConfig.maxRetries || !retryConfig.retryCondition(lastError)) {
          throw lastError;
        }

        // Wait before retrying (exponential backoff)
        const delay = retryConfig.retryDelay * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    const response = await this.executeRequest(url, {
      method: 'GET',
      ...config
    });

    return response.json();
  }

  async post<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    const response = await this.executeRequest(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...config
    });

    return response.json();
  }

  async put<T>(url: string, data?: any, config?: RequestConfig): Promise<T> {
    const response = await this.executeRequest(url, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...config
    });

    return response.json();
  }

  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    const response = await this.executeRequest(url, {
      method: 'DELETE',
      ...config
    });

    return response.json();
  }

  async downloadFile(url: string, filename?: string): Promise<void> {
    try {
      const response = await this.executeRequest(url, {
        method: 'GET'
      });

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('File download failed:', error);
      throw error;
    }
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.get('/api/health');
  }
}

// Default instance
export const apiClient = new ApiClient();

// Electron-specific API client (uses IPC instead of HTTP)
class ElectronApiClient {
  private electronAPI: any;

  constructor() {
    if (typeof window !== 'undefined') {
      this.electronAPI = (window as any).electronAPI;
    }
  }

  private async invokeWithErrorHandling<T>(channel: string, ...args: any[]): Promise<T> {
    if (!this.electronAPI) {
      throw new Error('Electron API not available');
    }

    try {
      const result = await this.electronAPI.invoke(channel, ...args);
      
      if (result && result.success === false) {
        const error = new Error(result.error || 'Unknown error');
        (error as any).userMessage = result.userMessage;
        throw error;
      }

      return result.data || result;
    } catch (error) {
      console.error(`Electron IPC error (${channel}):`, error);
      throw error;
    }
  }

  async getActivityStats() {
    return this.invokeWithErrorHandling('get-activity-stats');
  }

  async getTrackingStatus() {
    return this.invokeWithErrorHandling('get-tracking-status');
  }

  async getTodaysSummary() {
    return this.invokeWithErrorHandling('get-todays-summary');
  }

  async getDashboardUrl() {
    return this.invokeWithErrorHandling('get-dashboard-url');
  }

  async startFocusSession(sessionId: string) {
    return this.invokeWithErrorHandling('focus-start-session', sessionId);
  }

  async endFocusSession() {
    return this.invokeWithErrorHandling('focus-end-session');
  }

  async getFocusStatus() {
    return this.invokeWithErrorHandling('focus-get-status');
  }

  async getHealthStatus() {
    return this.invokeWithErrorHandling('get-health-status');
  }

  async reportError(errorData: {
    message: string;
    stack?: string;
    operation: string;
    userMessage: string;
  }) {
    return this.invokeWithErrorHandling('report-error', errorData);
  }
}

export const electronApi = new ElectronApiClient();

// Utility functions for common API patterns
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }

      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
    }
  }

  throw lastError!;
};

export const withTimeout = async <T>(
  operation: () => Promise<T>,
  timeout: number = 10000
): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timeout after ${timeout}ms`)), timeout);
  });

  return Promise.race([operation(), timeoutPromise]);
};

// Error classification helpers
export const isNetworkError = (error: Error): boolean => {
  return error.message.includes('fetch') || 
         error.message.includes('network') ||
         error.message.includes('NetworkError') ||
         error.message.includes('timeout');
};

export const isServerError = (error: ApiError): boolean => {
  return error.status ? error.status >= 500 : false;
};

export const isClientError = (error: ApiError): boolean => {
  return error.status ? error.status >= 400 && error.status < 500 : false;
};