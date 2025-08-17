'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { isToday, format } from 'date-fns';
import { Clock, Target, TrendingUp, Calendar, Coffee, Zap, BarChart3, Activity } from 'lucide-react';

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
          <h3 className="text-lg font-semibold text-gray-900">Today&apos;s Summary</h3>
        </div>
        <span className="text-sm text-gray-500">{format(new Date(), 'EEEE, MMM d')}</span>
      </div>

      {/* Enhanced Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-50 via-blue-50 to-indigo-100 border border-blue-200 hover:shadow-md transition-shadow">
          <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-700 mb-1">{formatDuration(todayStats.totalTime)}</p>
          <p className="text-sm text-blue-600 font-medium">Total Time</p>
        </div>
        
        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-green-50 via-green-50 to-emerald-100 border border-green-200 hover:shadow-md transition-shadow">
          <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <Target className="w-6 h-6 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-700 mb-1">{formatDuration(todayStats.productiveTime)}</p>
          <p className="text-sm text-green-600 font-medium">Productive</p>
        </div>
        
        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-purple-50 via-purple-50 to-violet-100 border border-purple-200 hover:shadow-md transition-shadow">
          <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <Zap className="w-6 h-6 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-purple-700 mb-1">{todayStats.totalActivities}</p>
          <p className="text-sm text-purple-600 font-medium">Activities</p>
        </div>
        
        <div className="text-center p-4 rounded-xl bg-gradient-to-br from-orange-50 via-orange-50 to-amber-100 border border-orange-200 hover:shadow-md transition-shadow">
          <div className="bg-orange-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
            <TrendingUp className="w-6 h-6 text-orange-600" />
          </div>
          <p className={`text-2xl font-bold mb-1 px-3 py-1 rounded-lg ${getFocusScoreColor(todayStats.focusScore)}`}>
            {todayStats.focusScore}%
          </p>
          <p className="text-sm text-orange-600 font-medium">Focus Score</p>
        </div>
      </div>

      {/* Enhanced Activity Breakdown with Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Types with Bar Chart */}
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <BarChart3 className="w-4 h-4 text-gray-600" />
            <h4 className="font-medium text-gray-800">Activity Distribution</h4>
          </div>
          
          {/* Mini bar chart */}
          <div className="h-24 mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={Object.entries(todayStats.activityBreakdown)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 5)
                  .map(([type, seconds]) => ({
                    name: type,
                    value: Math.round(seconds / 60),
                    fill: {
                      code: '#6366f1',
                      build: '#10b981',
                      test: '#f59e0b',
                      debug: '#ef4444',
                      research: '#8b5cf6',
                      design: '#ec4899',
                      document: '#84cc16',
                      communication: '#f97316',
                      browsing: '#06b6d4',
                      other: '#6b7280'
                    }[type as keyof typeof getActivityIcon] || '#6b7280'
                  }))
                }
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
              >
                <XAxis 
                  dataKey="name" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#6b7280' }}
                />
                <YAxis hide />
                <Bar 
                  dataKey="value" 
                  radius={[2, 2, 0, 0]}
                >
                  {Object.entries(todayStats.activityBreakdown)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map((entry, index) => {
                      const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
                      return <Cell key={`cell-${index}`} fill={colors[index]} />;
                    })
                  }
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          {/* Activity list with enhanced styling */}
          <div className="space-y-2">
            {Object.entries(todayStats.activityBreakdown)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([type, seconds], index) => {
                const percentage = Math.round((seconds / todayStats.totalTime) * 100);
                const colors = ['bg-indigo-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500'];
                return (
                  <div key={type} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${colors[index]}`} />
                      <span className="text-lg">{getActivityIcon(type)}</span>
                      <span className="text-sm font-medium text-gray-700 capitalize">{type}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-bold text-gray-900">{formatDuration(seconds)}</span>
                      <div className="text-xs text-gray-500">{percentage}%</div>
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>

        {/* App Usage with Progress Bars */}
        <div>
          <div className="flex items-center space-x-2 mb-3">
            <Activity className="w-4 h-4 text-gray-600" />
            <h4 className="font-medium text-gray-800">Top Applications</h4>
          </div>
          
          <div className="space-y-3">
            {Object.entries(todayStats.appBreakdown)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 5)
              .map(([app, seconds], index) => {
                const percentage = Math.round((seconds / todayStats.totalTime) * 100);
                const maxSeconds = Math.max(...Object.values(todayStats.appBreakdown));
                const relativeWidth = (seconds / maxSeconds) * 100;
                const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500'];
                
                return (
                  <div key={app} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700 truncate flex-1 mr-2">{app}</span>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-900">{formatDuration(seconds)}</span>
                        <div className="text-xs text-gray-500">{percentage}%</div>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${colors[index]}`}
                        style={{ width: `${relativeWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })
            }
          </div>
        </div>
      </div>

      {/* Enhanced Session Stats */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
            <div className="flex items-center justify-center mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-sm text-blue-600 font-medium mb-1">Longest Session</p>
            <p className="text-lg font-bold text-blue-700">{formatDuration(todayStats.longestSession)}</p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
            <div className="flex items-center justify-center mb-2">
              <Target className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-sm text-green-600 font-medium mb-1">Average Session</p>
            <p className="text-lg font-bold text-green-700">{formatDuration(todayStats.averageSession)}</p>
          </div>
          <div className="p-3 rounded-lg bg-gradient-to-br from-orange-50 to-red-50 border border-orange-100">
            <div className="flex items-center justify-center mb-2">
              <Coffee className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-sm text-orange-600 font-medium mb-1">Break Time</p>
            <p className="text-lg font-bold text-orange-700">{formatDuration(todayStats.breakTime)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}