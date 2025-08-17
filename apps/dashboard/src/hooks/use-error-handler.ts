'use client';

import { useState, useCallback } from 'react';

export interface ErrorState {
  error: Error | null;
  isLoading: boolean;
  retryCount: number;
}

interface UseErrorHandlerOptions {
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: Error) => void;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const { maxRetries = 3, retryDelay = 1000, onError } = options;
  
  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isLoading: false,
    retryCount: 0
  });

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isLoading: false,
      retryCount: 0
    });
  }, []);

  const handleError = useCallback((error: Error) => {
    console.error('Error handled:', error);
    
    setErrorState(prev => ({
      error,
      isLoading: false,
      retryCount: prev.retryCount
    }));

    if (onError) {
      onError(error);
    }
  }, [onError]);

  const executeWithErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    setErrorState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      const result = await operation();
      setErrorState(prev => ({
        ...prev,
        isLoading: false,
        error: null
      }));
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      
      console.error(`Error in ${context || 'operation'}:`, err);
      
      setErrorState(prev => ({
        error: err,
        isLoading: false,
        retryCount: prev.retryCount
      }));

      if (onError) {
        onError(err);
      }

      return null;
    }
  }, [onError]);

  const retryOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    if (errorState.retryCount >= maxRetries) {
      console.warn(`Max retries (${maxRetries}) reached for ${context || 'operation'}`);
      return null;
    }

    setErrorState(prev => ({
      ...prev,
      isLoading: true,
      retryCount: prev.retryCount + 1
    }));

    // Add delay before retry
    if (retryDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, retryDelay * errorState.retryCount));
    }

    return executeWithErrorHandling(operation, context);
  }, [errorState.retryCount, maxRetries, retryDelay, executeWithErrorHandling]);

  return {
    error: errorState.error,
    isLoading: errorState.isLoading,
    retryCount: errorState.retryCount,
    canRetry: errorState.retryCount < maxRetries,
    clearError,
    handleError,
    executeWithErrorHandling,
    retryOperation
  };
}

// Hook for network-specific error handling
export function useNetworkErrorHandler() {
  return useErrorHandler({
    maxRetries: 3,
    retryDelay: 1000,
    onError: (error) => {
      // Check if it's a network error
      if (error.message.includes('fetch') || 
          error.message.includes('network') ||
          error.message.includes('NetworkError')) {
        console.warn('Network error detected:', error.message);
      }
    }
  });
}

// Hook for API-specific error handling
export function useApiErrorHandler() {
  return useErrorHandler({
    maxRetries: 2,
    retryDelay: 2000,
    onError: (error) => {
      // Log API errors for debugging
      console.error('API Error:', {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
  });
}