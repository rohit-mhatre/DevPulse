'use client';

import React, { useState } from 'react';
import { Download, Calendar, Filter, FileText, BarChart3, Target } from 'lucide-react';

interface ExportFilters {
  startDate: string;
  endDate: string;
  activityTypes: string[];
  sessionTypes: string[];
  format: 'csv' | 'json';
}

interface ExportManagerProps {
  focusSessions?: any[];
}

export function ExportManager({ focusSessions = [] }: ExportManagerProps) {
  const [activeTab, setActiveTab] = useState<'activity' | 'focus' | 'summary'>('activity');
  const [isExporting, setIsExporting] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Get today's date and 30 days ago as defaults
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [filters, setFilters] = useState<ExportFilters>({
    startDate: thirtyDaysAgo,
    endDate: today,
    activityTypes: [],
    sessionTypes: [],
    format: 'json'
  });

  const activityTypeOptions = [
    { id: 'code', label: 'Coding', color: 'bg-blue-500' },
    { id: 'build', label: 'Building', color: 'bg-green-500' },
    { id: 'test', label: 'Testing', color: 'bg-yellow-500' },
    { id: 'debug', label: 'Debugging', color: 'bg-red-500' },
    { id: 'research', label: 'Research', color: 'bg-purple-500' },
    { id: 'design', label: 'Design', color: 'bg-pink-500' },
    { id: 'document', label: 'Documentation', color: 'bg-indigo-500' },
    { id: 'meeting', label: 'Meetings', color: 'bg-orange-500' },
    { id: 'review', label: 'Code Review', color: 'bg-teal-500' },
    { id: 'browsing', label: 'Browsing', color: 'bg-gray-500' },
    { id: 'other', label: 'Other', color: 'bg-gray-400' }
  ];

  const sessionTypeOptions = [
    { id: 'deep-work', label: 'Deep Work', icon: '🧠' },
    { id: 'code-review', label: 'Code Review', icon: '👀' },
    { id: 'learning', label: 'Learning', icon: '📚' },
    { id: 'meeting-prep', label: 'Meeting Prep', icon: '📝' }
  ];

  const handleActivityTypeToggle = (typeId: string) => {
    setFilters(prev => ({
      ...prev,
      activityTypes: prev.activityTypes.includes(typeId)
        ? prev.activityTypes.filter(id => id !== typeId)
        : [...prev.activityTypes, typeId]
    }));
  };

  const handleSessionTypeToggle = (typeId: string) => {
    setFilters(prev => ({
      ...prev,
      sessionTypes: prev.sessionTypes.includes(typeId)
        ? prev.sessionTypes.filter(id => id !== typeId)
        : [...prev.sessionTypes, typeId]
    }));
  };

  const exportActivity = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        format: filters.format,
        startDate: filters.startDate,
        endDate: filters.endDate,
        ...(filters.activityTypes.length > 0 && { activityTypes: filters.activityTypes.join(',') })
      });

      const response = await fetch(`/api/export/activity?${params}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      if (filters.format === 'csv') {
        // Handle CSV download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `devpulse-activity-export-${filters.startDate}-to-${filters.endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Handle JSON download
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `devpulse-activity-export-${filters.startDate}-to-${filters.endDate}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      showSuccessMessage('Activity data exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      showErrorMessage('Failed to export activity data. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportFocusSessions = async () => {
    setIsExporting(true);
    try {
      // Get focus sessions from localStorage
      const savedSessions = localStorage.getItem('devpulse-focus-sessions');
      const sessions = savedSessions ? JSON.parse(savedSessions) : [];

      if (sessions.length === 0) {
        showErrorMessage('No focus sessions found to export.');
        setIsExporting(false);
        return;
      }

      // Apply filters
      const requestBody = {
        sessions,
        filters: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          sessionTypes: filters.sessionTypes.length > 0 ? filters.sessionTypes : undefined
        }
      };

      const params = new URLSearchParams({ format: filters.format });
      const response = await fetch(`/api/export/focus-sessions?${params}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      if (filters.format === 'csv') {
        // Handle CSV download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `devpulse-focus-sessions-export-${filters.startDate}-to-${filters.endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Handle JSON download
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `devpulse-focus-sessions-export-${filters.startDate}-to-${filters.endDate}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      showSuccessMessage('Focus sessions exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      showErrorMessage('Failed to export focus sessions. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const exportProductivitySummary = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        format: filters.format,
        startDate: filters.startDate,
        endDate: filters.endDate,
        groupBy: 'daily'
      });

      const response = await fetch(`/api/export/productivity-summary?${params}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      if (filters.format === 'csv') {
        // Handle CSV download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `devpulse-productivity-summary-${filters.startDate}-to-${filters.endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Handle JSON download
        const data = await response.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `devpulse-productivity-summary-${filters.startDate}-to-${filters.endDate}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      showSuccessMessage('Productivity summary exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      showErrorMessage('Failed to export productivity summary. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const showSuccessMessage = (message: string) => {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'fixed top-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg z-50 flex items-center space-x-2';
    alertDiv.innerHTML = `
      <span class="text-xl">✅</span>
      <span>${message}</span>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => {
      if (document.body.contains(alertDiv)) {
        document.body.removeChild(alertDiv);
      }
    }, 5000);
  };

  const showErrorMessage = (message: string) => {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'fixed top-4 right-4 bg-red-600 text-white p-4 rounded-lg shadow-lg z-50 flex items-center space-x-2';
    alertDiv.innerHTML = `
      <span class="text-xl">❌</span>
      <span>${message}</span>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => {
      if (document.body.contains(alertDiv)) {
        document.body.removeChild(alertDiv);
      }
    }, 5000);
  };

  const handleExport = () => {
    switch (activeTab) {
      case 'activity':
        exportActivity();
        break;
      case 'focus':
        exportFocusSessions();
        break;
      case 'summary':
        exportProductivitySummary();
        break;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Download className="w-6 h-6 text-indigo-600" />
          <h2 className="text-xl font-semibold text-gray-900">Export Data</h2>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 transition-colors"
        >
          <Filter className="w-4 h-4" />
          <span>Filters</span>
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End Date</label>
                  <input
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
              <select
                value={filters.format}
                onChange={(e) => setFilters(prev => ({ ...prev, format: e.target.value as 'csv' | 'json' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
              </select>
            </div>
          </div>

          {/* Activity Type Filters */}
          {(activeTab === 'activity' || activeTab === 'summary') && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Activity Types (optional)</label>
              <div className="flex flex-wrap gap-2">
                {activityTypeOptions.map(type => (
                  <button
                    key={type.id}
                    onClick={() => handleActivityTypeToggle(type.id)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      filters.activityTypes.includes(type.id)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Session Type Filters */}
          {activeTab === 'focus' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Session Types (optional)</label>
              <div className="flex flex-wrap gap-2">
                {sessionTypeOptions.map(type => (
                  <button
                    key={type.id}
                    onClick={() => handleSessionTypeToggle(type.id)}
                    className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      filters.sessionTypes.includes(type.id)
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <span>{type.icon}</span>
                    <span>{type.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6">
        {[
          { id: 'activity', label: 'Activity Logs', icon: FileText },
          { id: 'focus', label: 'Focus Sessions', icon: Target },
          { id: 'summary', label: 'Productivity Summary', icon: BarChart3 }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="space-y-4">
        {activeTab === 'activity' && (
          <div className="text-center py-4">
            <div className="bg-blue-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-900 mb-2">Activity Data Export</h3>
              <p className="text-blue-700 text-sm">
                Export detailed activity logs including timestamps, app usage, activity types, 
                project information, and productivity scores.
              </p>
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Includes: timestamps, activity types, app names, durations, project names, productivity scores
            </div>
          </div>
        )}

        {activeTab === 'focus' && (
          <div className="text-center py-4">
            <div className="bg-green-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-green-900 mb-2">Focus Sessions Export</h3>
              <p className="text-green-700 text-sm">
                Export focus session data including session types, durations, completion status, 
                focus scores, and distraction counts.
              </p>
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Includes: session types, start/end times, durations, completion status, focus scores, distractions
            </div>
          </div>
        )}

        {activeTab === 'summary' && (
          <div className="text-center py-4">
            <div className="bg-purple-50 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-purple-900 mb-2">Productivity Summary Export</h3>
              <p className="text-purple-700 text-sm">
                Export aggregated productivity metrics including daily totals, productivity percentages, 
                focus scores, and goal progress.
              </p>
            </div>
            <div className="text-sm text-gray-600 mb-4">
              Includes: daily totals, productivity percentages, top apps/activities, focus scores, goal progress
            </div>
          </div>
        )}

        {/* Export Button */}
        <div className="flex justify-center pt-4">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
              isExporting
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export {activeTab === 'activity' ? 'Activity Data' : activeTab === 'focus' ? 'Focus Sessions' : 'Productivity Summary'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}