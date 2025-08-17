'use client';

import { ErrorBoundary } from './error-boundary';

interface ErrorWrapperProps {
  children: React.ReactNode;
  showDetails?: boolean;
}

export function ErrorWrapper({ children, showDetails }: ErrorWrapperProps) {
  return (
    <ErrorBoundary
      showDetails={showDetails}
      onError={(error, errorInfo) => {
        // Log error to console in development
        if (process.env.NODE_ENV === 'development') {
          console.error('React Error Boundary caught an error:', error, errorInfo);
        }
        
        // Report error to main process if in Electron
        if (typeof window !== 'undefined' && (window as any).electronAPI) {
          (window as any).electronAPI.reportError({
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
            operation: 'react_render',
            userMessage: 'A rendering error occurred in the dashboard'
          }).catch((reportError: Error) => {
            console.error('Failed to report error to main process:', reportError);
          });
        }
      }}
    >
      {children}
    </ErrorBoundary>
  );
}