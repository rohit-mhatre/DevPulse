'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    });

    // Log the error
    console.error('Error caught by boundary:', error, errorInfo);

    // Call onError prop if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send error to main process for logging (in Electron context)
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      (window as any).electronAPI.reportError({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        operation: 'react_render',
        userMessage: 'A rendering error occurred in the dashboard'
      });
    }
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, errorId: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo!, this.retry);
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg
                    className="h-6 w-6 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-medium text-gray-900">
                  Something went wrong
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  An unexpected error occurred while rendering this page.
                </p>
                
                {this.props.showDetails && this.state.error && (
                  <div className="mt-4 p-4 bg-gray-100 rounded-lg text-left">
                    <details>
                      <summary className="cursor-pointer text-sm font-medium text-gray-700">
                        Error Details
                      </summary>
                      <div className="mt-2 text-xs text-gray-600 font-mono">
                        <div className="mb-2">
                          <strong>Error:</strong> {this.state.error.message}
                        </div>
                        {this.state.errorId && (
                          <div className="mb-2">
                            <strong>ID:</strong> {this.state.errorId}
                          </div>
                        )}
                        <div className="mb-2">
                          <strong>Stack:</strong>
                          <pre className="mt-1 whitespace-pre-wrap break-all">
                            {this.state.error.stack}
                          </pre>
                        </div>
                        {this.state.errorInfo && (
                          <div>
                            <strong>Component Stack:</strong>
                            <pre className="mt-1 whitespace-pre-wrap break-all">
                              {this.state.errorInfo.componentStack}
                            </pre>
                          </div>
                        )}
                      </div>
                    </details>
                  </div>
                )}

                <div className="mt-6 flex flex-col space-y-3">
                  <button
                    onClick={this.retry}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Try Again
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Reload Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Async error boundary for handling promise rejections
export function useAsyncError() {
  const [_, setError] = React.useState();
  
  return React.useCallback(
    (error: Error) => {
      setError(() => {
        throw error;
      });
    },
    []
  );
}