'use client';

import { useMemo } from 'react';
import { isToday, format } from 'date-fns';
import { Clock, Target, TrendingUp, Calendar, Coffee, Zap } from 'lucide-react';

interface ActivityData {
  timestamp: number;
  activity_type: string;
  app_name: string;
  duration_seconds: number;
  project_name?: string;
}

interface TodaysSummaryProps {
  data: ActivityData[];
}

interface TodayStats {
  totalTime: number;
  totalActivities: number;
  longestSession: number;
  shortestSession: number;
  averageSession: number;
  mostUsedApp: string;
  topActivityType: string;
  productiveTime: number;
  breakTime: number;
  focusScore: number;
  activityBreakdown: Record<string, number>;
  appBreakdown: Record<string, number>;
}

export function TodaysSummary({ data }: TodaysSummaryProps) {
  const todayStats = useMemo((): TodayStats => {
    const todayData = data.filter(activity => isToday(new Date(activity.timestamp)));
    
    if (todayData.length === 0) {
      return {
        totalTime: 0,
        totalActivities: 0,
        longestSession: 0,
        shortestSession: 0,
        averageSession: 0,
        mostUsedApp: '',
        topActivityType: '',
        productiveTime: 0,
        breakTime: 0,
        focusScore: 0,
        activityBreakdown: {},
        appBreakdown: {}
      };
    }

    const totalTime = todayData.reduce((sum, a) => sum + a.duration_seconds, 0);
    const durations = todayData.map(a => a.duration_seconds);
    const longestSession = Math.max(...durations);
    const shortestSession = Math.min(...durations);
    const averageSession = Math.floor(totalTime / todayData.length);

    // App breakdown
    const appBreakdown = todayData.reduce((acc, activity) => {
      acc[activity.app_name] = (acc[activity.app_name] || 0) + activity.duration_seconds;
      return acc;
    }, {} as Record<string, number>);

    const mostUsedApp = Object.keys(appBreakdown).reduce((a, b) => 
      appBreakdown[a] > appBreakdown[b] ? a : b, '');

    // Activity type breakdown
    const activityBreakdown = todayData.reduce((acc, activity) => {
      acc[activity.activity_type] = (acc[activity.activity_type] || 0) + activity.duration_seconds;
      return acc;
    }, {} as Record<string, number>);

    const topActivityType = Object.keys(activityBreakdown).reduce((a, b) => 
      activityBreakdown[a] > activityBreakdown[b] ? a : b, '');

    // Calculate productive vs break time
    const productiveTypes = ['code', 'build', 'test', 'debug', 'research', 'design', 'document'];
    const productiveTime = todayData
      .filter(a => productiveTypes.includes(a.activity_type))
      .reduce((sum, a) => sum + a.duration_seconds, 0);
    
    const breakTime = totalTime - productiveTime;

    // Focus score (percentage of time in productive activities)
    const focusScore = totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 0;

    return {
      totalTime,
      totalActivities: todayData.length,
      longestSession,
      shortestSession,
      averageSession,
      mostUsedApp,
      topActivityType,
      productiveTime,
      breakTime,
      focusScore,
      activityBreakdown,
      appBreakdown
    };
  }, [data]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  };

  const getActivityIcon = (activityType: string) => {
    const iconMap = {
      code: '💻',
      build: '🔨',
      test: '🧪',
      debug: '🐛',
      browsing: '🌐',
      research: '📚',
      communication: '💬',
      design: '🎨',
      document: '📄',
      other: '⚡'
    };
    return iconMap[activityType as keyof typeof iconMap] || '⚡';
  };

  const getFocusScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    if (score >= 40) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  if (todayStats.totalActivities === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="text-center py-8">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Activity Today</h3>
          <p className="text-gray-500">Start working to see your productivity summary!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">Today's Summary</h3>
        </div>
        <span className="text-sm text-gray-500">{format(new Date(), 'EEEE, MMM d')}</span>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 rounded-lg bg-blue-50">
          <Clock className="w-6 h-6 text-blue-600 mx-auto mb-1" />
          <p className="text-xl font-bold text-blue-600">{formatDuration(todayStats.totalTime)}</p>
          <p className="text-xs text-blue-600">Total Time</p>
        </div>
        
        <div className="text-center p-3 rounded-lg bg-green-50">
          <Target className="w-6 h-6 text-green-600 mx-auto mb-1" />
          <p className="text-xl font-bold text-green-600">{formatDuration(todayStats.productiveTime)}</p>
          <p className="text-xs text-green-600">Productive</p>
        </div>
        
        <div className="text-center p-3 rounded-lg bg-purple-50">
          <Zap className="w-6 h-6 text-purple-600 mx-auto mb-1" />
          <p className="text-xl font-bold text-purple-600">{todayStats.totalActivities}</p>
          <p className="text-xs text-purple-600">Activities</p>
        </div>
        
        <div className="text-center p-3 rounded-lg bg-orange-50">
          <TrendingUp className="w-6 h-6 text-orange-600 mx-auto mb-1" />
          <p className={`text-xl font-bold px-2 py-1 rounded ${getFocusScoreColor(todayStats.focusScore)}`}>
            {todayStats.focusScore}%
          </p>
          <p className="text-xs text-orange-600">Focus Score</p>
        </div>
      </div>

      {/* Activity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Types */}
        <div>
          <h4 className="font-medium text-gray-800 mb-3">Activity Breakdown</h4>
          <div className="space-y-2">
            {Object.entries(todayStats.activityBreakdown)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([type, seconds]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getActivityIcon(type)}</span>
                    <span className="text-sm font-medium text-gray-700 capitalize">{type}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">{formatDuration(seconds)}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({Math.round((seconds / todayStats.totalTime) * 100)}%)
                    </span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>

        {/* App Usage */}
        <div>
          <h4 className="font-medium text-gray-800 mb-3">Top Applications</h4>
          <div className="space-y-2">
            {Object.entries(todayStats.appBreakdown)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([app, seconds]) => (
                <div key={app} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 truncate">{app}</span>
                  <div className="text-right">
                    <span className="text-sm font-medium text-gray-900">{formatDuration(seconds)}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      ({Math.round((seconds / todayStats.totalTime) * 100)}%)
                    </span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {/* Session Stats */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-500">Longest Session</p>
            <p className="font-medium text-gray-900">{formatDuration(todayStats.longestSession)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Average Session</p>
            <p className="font-medium text-gray-900">{formatDuration(todayStats.averageSession)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Break Time</p>
            <p className="font-medium text-gray-900">{formatDuration(todayStats.breakTime)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}