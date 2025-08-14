'use client';

import { useMemo } from 'react';
import { Target, TrendingUp, Clock, Activity, AlertTriangle, CheckCircle } from 'lucide-react';
import { FocusSession } from './focus-session-manager';

interface FocusStatsProps {
  currentSession: FocusSession;
  todaySessions: FocusSession[];
  totalFocusTimeToday: number;
  activityData: any[];
}

export function FocusStats({ 
  currentSession, 
  todaySessions, 
  totalFocusTimeToday, 
  activityData 
}: FocusStatsProps) {
  
  // Calculate real-time focus score during active session
  const currentFocusScore = useMemo(() => {
    if (!currentSession.isActive) return 0;
    
    const sessionStart = currentSession.startTime;
    const now = Date.now();
    
    // Get activities during current session
    const sessionActivities = activityData.filter(activity => {
      const activityTime = new Date(activity.timestamp).getTime();
      return activityTime >= sessionStart && activityTime <= now;
    });
    
    if (sessionActivities.length === 0) return 100; // No distractions yet
    
    // Calculate focus score based on activity types
    const productiveActivities = sessionActivities.filter(activity => 
      ['code', 'research', 'design', 'documentation'].includes(activity.activity_type)
    );
    
    const distractingActivities = sessionActivities.filter(activity => 
      ['social', 'entertainment', 'shopping', 'news'].includes(activity.activity_type)
    );
    
    // Weight the score based on time spent
    const totalSessionTime = sessionActivities.reduce((sum, activity) => 
      sum + activity.duration_seconds, 0
    );
    
    const productiveTime = productiveActivities.reduce((sum, activity) => 
      sum + activity.duration_seconds, 0
    );
    
    if (totalSessionTime === 0) return 100;
    
    const baseScore = (productiveTime / totalSessionTime) * 100;
    
    // Penalty for distracting activities
    const distractionPenalty = Math.min(30, distractingActivities.length * 5);
    
    return Math.max(0, Math.round(baseScore - distractionPenalty));
  }, [currentSession, activityData]);

  // Detect current distractions
  const currentDistractions = useMemo(() => {
    if (!currentSession.isActive) return [];
    
    const lastMinute = Date.now() - 60000; // Last minute
    const recentActivities = activityData.filter(activity => {
      const activityTime = new Date(activity.timestamp).getTime();
      return activityTime >= lastMinute;
    });
    
    return recentActivities.filter(activity => 
      ['social', 'entertainment', 'shopping', 'news', 'communication'].includes(activity.activity_type)
    );
  }, [currentSession, activityData]);

  // Calculate session progress
  const getSessionProgress = () => {
    if (!currentSession.isActive) return 0;
    
    const elapsed = Math.floor((Date.now() - currentSession.startTime) / 1000) - currentSession.pausedTime;
    return Math.min(100, (elapsed / currentSession.duration) * 100);
  };

  const formatDuration = (milliseconds: number): string => {
    const seconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const averageScoreToday = todaySessions.length > 0 
    ? Math.round(todaySessions.reduce((sum, session) => sum + (session.productivityScore || 0), 0) / todaySessions.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Current Session Stats */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Session</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Real-time Focus Score */}
          <div className={`p-4 rounded-lg ${getScoreBgColor(currentFocusScore)}`}>
            <div className="flex items-center space-x-2 mb-2">
              <Target className={`w-5 h-5 ${getScoreColor(currentFocusScore)}`} />
              <span className="font-medium text-gray-900">Focus Score</span>
            </div>
            <p className={`text-2xl font-bold ${getScoreColor(currentFocusScore)}`}>
              {currentFocusScore}%
            </p>
            <p className="text-xs text-gray-600">Real-time</p>
          </div>

          {/* Session Progress */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-900">Progress</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {Math.round(getSessionProgress())}%
            </p>
            <p className="text-xs text-gray-600">Complete</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Session Progress</span>
            <span>{Math.round(getSessionProgress())}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 bg-blue-500 rounded-full transition-all duration-1000"
              style={{ width: `${getSessionProgress()}%` }}
            ></div>
          </div>
        </div>

        {/* Distraction Alerts */}
        {currentDistractions.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span className="font-medium text-red-800">Distraction Detected</span>
            </div>
            <p className="text-sm text-red-700">
              Recent non-productive activity: {currentDistractions[0]?.app_name}
            </p>
          </div>
        )}

        {/* No Distractions */}
        {currentSession.isActive && currentDistractions.length === 0 && currentFocusScore >= 80 && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="font-medium text-green-800">Great Focus!</span>
              <span className="text-sm text-green-700">No distractions detected</span>
            </div>
          </div>
        )}
      </div>

      {/* Today's Overview */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Summary</h3>
        
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Clock className="w-4 h-4 text-gray-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">
              {formatDuration(totalFocusTimeToday)}
            </p>
            <p className="text-xs text-gray-500">Total Focus</p>
          </div>
          
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <Activity className="w-4 h-4 text-gray-600" />
            </div>
            <p className="text-xl font-bold text-gray-900">{todaySessions.length}</p>
            <p className="text-xs text-gray-500">Sessions</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <p className={`text-xl font-bold ${getScoreColor(averageScoreToday)}`}>
              {averageScoreToday}%
            </p>
            <p className="text-xs text-gray-500">Avg Score</p>
          </div>
          
          <div className="text-center p-3 bg-indigo-50 rounded-lg">
            <p className="text-xl font-bold text-indigo-600">
              {todaySessions.length > 0 
                ? formatDuration(totalFocusTimeToday / todaySessions.length)
                : '0m'
              }
            </p>
            <p className="text-xs text-gray-500">Avg Length</p>
          </div>
        </div>
      </div>

      {/* Session Type Breakdown */}
      {todaySessions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Types Today</h3>
          
          <div className="space-y-3">
            {Object.entries(
              todaySessions.reduce((acc, session) => {
                acc[session.type] = (acc[session.type] || 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 capitalize">
                  {type.replace('-', ' ')}
                </span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 bg-indigo-500 rounded-full"
                      style={{ 
                        width: `${(count / todaySessions.length) * 100}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-8">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity Correlation */}
      {currentSession.isActive && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Tracking</h3>
          
          <div className="text-sm text-gray-600 space-y-2">
            <p>• Focus sessions are automatically correlated with your tracked activities</p>
            <p>• Productivity score based on time spent in productive vs distracting apps</p>
            <p>• Real-time distraction detection helps maintain focus</p>
          </div>
          
          {activityData.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900 mb-1">Recent Activity</p>
              <p className="text-xs text-gray-600">
                Last tracked: {activityData[0]?.app_name || 'No recent activity'}
                {activityData[0] && (
                  <span className="ml-2 px-2 py-1 bg-gray-200 rounded text-xs">
                    {activityData[0].activity_type}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}