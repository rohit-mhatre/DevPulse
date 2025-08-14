'use client';

import { useState, useMemo } from 'react';
import { format, isToday, isYesterday, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { 
  Calendar, 
  Clock, 
  Target, 
  TrendingUp, 
  Filter, 
  BarChart3,
  Coffee,
  Play,
  Pause
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { FocusSession, SessionType } from './focus-session-manager';

interface SessionHistoryProps {
  sessions: FocusSession[];
}

type TimeFilter = 'today' | 'yesterday' | 'week' | 'all';
type SessionTypeFilter = 'all' | SessionType;

export function SessionHistory({ sessions }: SessionHistoryProps) {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  const [typeFilter, setTypeFilter] = useState<SessionTypeFilter>('all');
  const [viewMode, setViewMode] = useState<'list' | 'chart'>('list');

  // Filter sessions based on selected filters
  const filteredSessions = useMemo(() => {
    let filtered = sessions.filter(session => session.endTime); // Only completed sessions

    // Apply time filter
    const now = new Date();
    switch (timeFilter) {
      case 'today':
        filtered = filtered.filter(session => isToday(new Date(session.startTime)));
        break;
      case 'yesterday':
        filtered = filtered.filter(session => isYesterday(new Date(session.startTime)));
        break;
      case 'week':
        const weekStart = startOfWeek(now);
        const weekEnd = endOfWeek(now);
        filtered = filtered.filter(session => {
          const sessionDate = new Date(session.startTime);
          return sessionDate >= weekStart && sessionDate <= weekEnd;
        });
        break;
      // 'all' - no filter
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(session => session.type === typeFilter);
    }

    return filtered.sort((a, b) => b.startTime - a.startTime);
  }, [sessions, timeFilter, typeFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalSessions = filteredSessions.length;
    const totalDuration = filteredSessions.reduce((sum, session) => {
      if (session.endTime) {
        return sum + (session.endTime - session.startTime - session.pausedTime);
      }
      return sum;
    }, 0);

    const averageDuration = totalSessions > 0 ? totalDuration / totalSessions : 0;
    const averageScore = totalSessions > 0 
      ? filteredSessions.reduce((sum, session) => sum + (session.productivityScore || 0), 0) / totalSessions
      : 0;

    const completionRate = totalSessions > 0
      ? (filteredSessions.filter(session => {
          if (!session.endTime) return false;
          const actualDuration = session.endTime - session.startTime - session.pausedTime;
          const targetDuration = session.duration * 1000;
          return actualDuration >= targetDuration * 0.8; // 80% completion threshold
        }).length / totalSessions) * 100
      : 0;

    return {
      totalSessions,
      totalDuration,
      averageDuration,
      averageScore,
      completionRate
    };
  }, [filteredSessions]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const dailyData: Record<string, { date: string; sessions: number; duration: number; score: number }> = {};

    filteredSessions.forEach(session => {
      const date = format(new Date(session.startTime), 'MMM dd');
      if (!dailyData[date]) {
        dailyData[date] = { date, sessions: 0, duration: 0, score: 0 };
      }

      dailyData[date].sessions += 1;
      if (session.endTime) {
        dailyData[date].duration += (session.endTime - session.startTime - session.pausedTime) / (1000 * 60); // Convert to minutes
      }
      dailyData[date].score += session.productivityScore || 0;
    });

    // Calculate average scores
    Object.values(dailyData).forEach(day => {
      if (day.sessions > 0) {
        day.score = day.score / day.sessions;
      }
    });

    return Object.values(dailyData).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [filteredSessions]);

  const formatDuration = (milliseconds: number): string => {
    const totalMinutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getSessionTypeIcon = (type: SessionType) => {
    switch (type) {
      case 'deep-work': return <Target className="w-4 h-4" />;
      case 'code-review': return <TrendingUp className="w-4 h-4" />;
      case 'learning': return <Coffee className="w-4 h-4" />;
      case 'meeting-prep': return <Calendar className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getSessionTypeColor = (type: SessionType) => {
    switch (type) {
      case 'deep-work': return 'bg-blue-100 text-blue-800';
      case 'code-review': return 'bg-green-100 text-green-800';
      case 'learning': return 'bg-purple-100 text-purple-800';
      case 'meeting-prep': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Filters and Controls */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
          {/* Time Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="week">This Week</option>
              <option value="all">All Time</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as SessionTypeFilter)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            >
              <option value="all">All Types</option>
              <option value="deep-work">Deep Work</option>
              <option value="code-review">Code Review</option>
              <option value="learning">Learning</option>
              <option value="meeting-prep">Meeting Prep</option>
            </select>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list' 
                  ? 'bg-indigo-100 text-indigo-600' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <Calendar className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('chart')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'chart' 
                  ? 'bg-indigo-100 text-indigo-600' 
                  : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center space-x-2 mb-2">
            <Play className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Sessions</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-700">Total Time</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatDuration(stats.totalDuration)}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center space-x-2 mb-2">
            <Target className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-gray-700">Avg Score</span>
          </div>
          <p className={`text-2xl font-bold ${getScoreColor(stats.averageScore)}`}>
            {Math.round(stats.averageScore)}%
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-gray-700">Completion</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{Math.round(stats.completionRate)}%</p>
        </div>
      </div>

      {/* Chart View */}
      {viewMode === 'chart' && chartData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Focus Trends</h3>
          
          <div className="h-64 mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="duration" 
                  stroke="#6366f1" 
                  strokeWidth={2}
                  name="Duration (min)"
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Avg Score"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                />
                <Bar dataKey="sessions" fill="#6366f1" name="Sessions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Session List */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Session History</h3>
            <p className="text-sm text-gray-600">
              {filteredSessions.length} sessions found
            </p>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="p-6 text-center">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h4 className="text-lg font-medium text-gray-900 mb-2">No sessions found</h4>
              <p className="text-gray-600">Try adjusting your filters or start a new focus session.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredSessions.map((session) => {
                const duration = session.endTime 
                  ? session.endTime - session.startTime - session.pausedTime
                  : 0;
                
                const completionPercentage = session.endTime
                  ? Math.min(100, (duration / (session.duration * 1000)) * 100)
                  : 0;

                return (
                  <div key={session.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className={`p-2 rounded-lg ${getSessionTypeColor(session.type)}`}>
                            {getSessionTypeIcon(session.type)}
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium text-gray-900 capitalize">
                            {session.type.replace('-', ' ')} Session
                          </h4>
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span>{format(new Date(session.startTime), 'MMM dd, yyyy')}</span>
                            <span>{format(new Date(session.startTime), 'h:mm a')}</span>
                            <span>Duration: {formatDuration(duration)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        {/* Completion */}
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-900">
                            {Math.round(completionPercentage)}%
                          </p>
                          <p className="text-xs text-gray-500">Complete</p>
                        </div>

                        {/* Productivity Score */}
                        {session.productivityScore !== undefined && (
                          <div className="text-center">
                            <p className={`text-sm font-medium ${getScoreColor(session.productivityScore)}`}>
                              {session.productivityScore}%
                            </p>
                            <p className="text-xs text-gray-500">Focus Score</p>
                          </div>
                        )}

                        {/* Breaks */}
                        <div className="text-center">
                          <p className="text-sm font-medium text-gray-900">
                            {session.breaks.length}
                          </p>
                          <p className="text-xs text-gray-500">Breaks</p>
                        </div>
                      </div>
                    </div>

                    {/* Activity Types */}
                    {session.activities.length > 0 && (
                      <div className="mt-3 flex items-center space-x-2">
                        <span className="text-xs text-gray-500">Activities:</span>
                        <div className="flex space-x-1">
                          {session.activities.map((activity, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                            >
                              {activity}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}