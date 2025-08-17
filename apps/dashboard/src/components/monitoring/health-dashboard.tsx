'use client';

import React, { useState, useEffect } from 'react';
import { electronApi } from '@/lib/api-client';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { LoadingError } from '@/components/error/loading-error';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  responseTime: number;
  metadata?: Record<string, any>;
  error?: Error;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: Record<string, HealthCheck>;
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
    critical: number;
  };
}

export const HealthDashboard: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { error, executeWithErrorHandling, retryOperation } = useErrorHandler({
    maxRetries: 3,
    retryDelay: 2000
  });

  const fetchHealthStatus = async () => {
    const result = await executeWithErrorHandling(
      () => electronApi.getHealthStatus(),
      'fetch_health_status'
    );

    if (result) {
      setHealth(result);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchHealthStatus();

    // Set up periodic health checks
    const interval = setInterval(fetchHealthStatus, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRetry = () => {
    setIsLoading(true);
    retryOperation(
      () => electronApi.getHealthStatus(),
      'fetch_health_status'
    ).then(result => {
      if (result) {
        setHealth(result);
      }
      setIsLoading(false);
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-100';
      case 'degraded':
        return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'degraded':
        return (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'unhealthy':
        return (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (error) {
    return (
      <LoadingError
        title="Health Status Error"
        message="Failed to load system health information."
        onRetry={handleRetry}
        isLoading={isLoading}
      />
    );
  }

  if (isLoading || !health) {
    return (
      <div className="animate-pulse">
        <div className="h-8 bg-gray-200 rounded mb-4"></div>
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">System Health</h2>
            <p className="text-sm text-gray-500">
              Last updated: {new Date(health.timestamp).toLocaleString()}
            </p>
          </div>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(health.status)}`}>
            {getStatusIcon(health.status)}
            <span className="ml-1 capitalize">{health.status}</span>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{health.summary.total}</div>
            <div className="text-sm text-gray-500">Total Checks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{health.summary.healthy}</div>
            <div className="text-sm text-gray-500">Healthy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-600">{health.summary.degraded}</div>
            <div className="text-sm text-gray-500">Degraded</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{health.summary.unhealthy}</div>
            <div className="text-sm text-gray-500">Unhealthy</div>
          </div>
        </div>
      </div>

      {/* Individual Health Checks */}
      <div className="space-y-4">
        {Object.entries(health.checks).map(([name, check]) => (
          <div key={name} className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${getStatusColor(check.status)} rounded-full p-1`}>
                  {getStatusIcon(check.status)}
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900 capitalize">
                    {name.replace(/_/g, ' ')}
                  </h3>
                  <p className="text-sm text-gray-500">{check.message}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-900">
                  {check.responseTime}ms
                </div>
                <div className="text-xs text-gray-500">Response Time</div>
              </div>
            </div>

            {/* Metadata */}
            {check.metadata && Object.keys(check.metadata).length > 0 && (
              <div className="mt-3 border-t border-gray-200 pt-3">
                <details className="text-sm">
                  <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                    View Details
                  </summary>
                  <div className="mt-2 bg-gray-50 rounded p-2">
                    <pre className="text-xs text-gray-600 overflow-x-auto">
                      {JSON.stringify(check.metadata, null, 2)}
                    </pre>
                  </div>
                </details>
              </div>
            )}

            {/* Error Details */}
            {check.error && (
              <div className="mt-3 border-t border-red-200 pt-3">
                <div className="text-sm text-red-600">
                  <strong>Error:</strong> {check.error.message}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Refresh Button */}
      <div className="text-center">
        <button
          onClick={handleRetry}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <svg
            className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          {isLoading ? 'Refreshing...' : 'Refresh Status'}
        </button>
      </div>
    </div>
  );
};