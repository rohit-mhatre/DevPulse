'use client';

import React, { useState } from 'react';
import { Download, FileText, Target, BarChart3 } from 'lucide-react';

interface ExportWidgetProps {
  className?: string;
}

export function ExportWidget({ className = '' }: ExportWidgetProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);

  const quickExport = async (type: 'activity' | 'focus' | 'summary', format: 'csv' | 'json' = 'csv') => {
    setIsExporting(type);
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      if (type === 'activity') {
        const params = new URLSearchParams({
          format,
          startDate: sevenDaysAgo,
          endDate: today
        });

        const response = await fetch(`/api/export/activity?${params}`);
        if (!response.ok) throw new Error('Export failed');

        const blob = await response.blob();
        downloadFile(blob, `devpulse-activity-last-7-days.${format}`);

      } else if (type === 'focus') {
        const savedSessions = localStorage.getItem('devpulse-focus-sessions');
        const sessions = savedSessions ? JSON.parse(savedSessions) : [];

        if (sessions.length === 0) {
          showMessage('No focus sessions found to export.', 'error');
          return;
        }

        const requestBody = {
          sessions,
          filters: { startDate: sevenDaysAgo, endDate: today }
        };

        const response = await fetch(`/api/export/focus-sessions?format=${format}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) throw new Error('Export failed');

        const blob = await response.blob();
        downloadFile(blob, `devpulse-focus-sessions-last-7-days.${format}`);

      } else if (type === 'summary') {
        const params = new URLSearchParams({
          format,
          startDate: sevenDaysAgo,
          endDate: today,
          groupBy: 'daily'
        });

        const response = await fetch(`/api/export/productivity-summary?${params}`);
        if (!response.ok) throw new Error('Export failed');

        const blob = await response.blob();
        downloadFile(blob, `devpulse-productivity-summary-last-7-days.${format}`);
      }

      showMessage('Export completed successfully!', 'success');
      setIsDropdownOpen(false);

    } catch (error) {
      console.error('Export failed:', error);
      showMessage('Export failed. Please try again.', 'error');
    } finally {
      setIsExporting(null);
    }
  };

  const downloadFile = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const showMessage = (message: string, type: 'success' | 'error') => {
    const alertDiv = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
    const icon = type === 'success' ? '✅' : '❌';
    
    alertDiv.className = `fixed top-4 right-4 ${bgColor} text-white p-4 rounded-lg shadow-lg z-50 flex items-center space-x-2`;
    alertDiv.innerHTML = `
      <span class="text-xl">${icon}</span>
      <span>${message}</span>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => {
      if (document.body.contains(alertDiv)) {
        document.body.removeChild(alertDiv);
      }
    }, 4000);
  };

  const exportOptions = [
    {
      id: 'activity',
      label: 'Activity Logs',
      description: 'Last 7 days activity data',
      icon: FileText,
      color: 'text-blue-600'
    },
    {
      id: 'focus',
      label: 'Focus Sessions',
      description: 'Recent focus session data',
      icon: Target,
      color: 'text-green-600'
    },
    {
      id: 'summary',
      label: 'Productivity Summary',
      description: 'Weekly productivity metrics',
      icon: BarChart3,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shadow-sm"
      >
        <Download className="w-4 h-4" />
        <span className="font-medium">Quick Export</span>
      </button>

      {isDropdownOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsDropdownOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-20">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Export (Last 7 Days)</h3>
              <div className="space-y-2">
                {exportOptions.map(option => (
                  <div key={option.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <option.icon className={`w-5 h-5 ${option.color}`} />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{option.label}</div>
                        <div className="text-xs text-gray-500">{option.description}</div>
                      </div>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => quickExport(option.id as any, 'csv')}
                        disabled={isExporting === option.id}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors disabled:opacity-50"
                      >
                        {isExporting === option.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-600"></div>
                        ) : (
                          'CSV'
                        )}
                      </button>
                      <button
                        onClick={() => quickExport(option.id as any, 'json')}
                        disabled={isExporting === option.id}
                        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors disabled:opacity-50"
                      >
                        {isExporting === option.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b border-gray-600"></div>
                        ) : (
                          'JSON'
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 pt-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsDropdownOpen(false);
                    // Navigate to full export page - you can implement this
                    window.open('/export', '_blank');
                  }}
                  className="w-full text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Advanced Export Options →
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}