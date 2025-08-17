'use client';

import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Database, Calendar, TrendingUp } from 'lucide-react';
import { ExportManager } from '@/components/export/export-manager';

export default function ExportPage() {
  const [focusSessions, setFocusSessions] = useState([]);
  const [activityStats, setActivityStats] = useState({
    totalActivities: 0,
    totalTime: 0,
    dateRange: { start: '', end: '' }
  });

  useEffect(() => {
    // Load focus sessions from localStorage
    const savedSessions = localStorage.getItem('devpulse-focus-sessions');
    if (savedSessions) {
      const sessions = JSON.parse(savedSessions);
      setFocusSessions(sessions);
    }

    // Fetch activity stats
    fetchActivityStats();
  }, []);

  const fetchActivityStats = async () => {
    try {
      const response = await fetch('/api/activity');
      if (response.ok) {
        const data = await response.json();
        if (data.activities && data.activities.length > 0) {
          const activities = data.activities;
          const totalTime = activities.reduce((sum: number, a: any) => sum + a.duration_seconds, 0);
          const timestamps = activities.map((a: any) => new Date(a.timestamp).getTime());
          const minDate = new Date(Math.min(...timestamps));
          const maxDate = new Date(Math.max(...timestamps));
          
          setActivityStats({
            totalActivities: activities.length,
            totalTime,
            dateRange: {
              start: minDate.toLocaleDateString(),
              end: maxDate.toLocaleDateString()
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch activity stats:', error);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.history.back()}
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </button>
              <div className="h-6 w-px bg-gray-300" />
              <div className="flex items-center space-x-3">
                <Download className="w-6 h-6 text-indigo-600" />
                <h1 className="text-2xl font-bold text-gray-900">Data Export</h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Activity Data Stats */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Activity Data</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Activities:</span>
                <span className="font-medium">{activityStats.totalActivities.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Time:</span>
                <span className="font-medium">{formatTime(activityStats.totalTime)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date Range:</span>
                <span className="font-medium text-sm">
                  {activityStats.dateRange.start && activityStats.dateRange.end
                    ? `${activityStats.dateRange.start} - ${activityStats.dateRange.end}`
                    : 'No data'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Focus Sessions Stats */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Focus Sessions</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Sessions:</span>
                <span className="font-medium">{focusSessions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Completed:</span>
                <span className="font-medium">
                  {focusSessions.filter((s: any) => s.completed).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Avg. Focus Score:</span>
                <span className="font-medium">
                  {focusSessions.length > 0
                    ? Math.round(focusSessions.reduce((sum: number, s: any) => sum + s.focusScore, 0) / focusSessions.length)
                    : 0
                  }%
                </span>
              </div>
            </div>
          </div>

          {/* Export Stats */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Export Options</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Formats:</span>
                <span className="font-medium">CSV, JSON</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Data Types:</span>
                <span className="font-medium">3 Available</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Filters:</span>
                <span className="font-medium">Date, Type</span>
              </div>
            </div>
          </div>
        </div>

        {/* Export Manager */}
        <div className="mb-8">
          <ExportManager focusSessions={focusSessions} />
        </div>

        {/* Information Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Export Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Data Sources</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Activity logs from DevPulse Desktop app</li>
                <li>• Focus session data from browser storage</li>
                <li>• Calculated productivity metrics</li>
                <li>• Project and app usage statistics</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Export Formats</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>CSV:</strong> Spreadsheet-compatible format</li>
                <li>• <strong>JSON:</strong> Structured data with metadata</li>
                <li>• Files include summary statistics</li>
                <li>• Data is filtered and cleaned for export</li>
              </ul>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Privacy & Security</h4>
            <p className="text-sm text-gray-600">
              All exports are generated locally and downloaded directly to your device. 
              No data is sent to external servers. Exported files contain only the data 
              you've explicitly chosen to include based on your filter settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}