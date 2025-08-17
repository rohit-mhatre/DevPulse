'use client';

import React from 'react';

interface FocusStatsProps {
  todayFocusTime: number;
  totalSessions: number;
  averageSessionLength: number;
  focusScore: number;
  weeklyTrend: number[];
}

export function FocusStats({ 
  todayFocusTime, 
  totalSessions, 
  averageSessionLength, 
  focusScore, 
  weeklyTrend 
}: FocusStatsProps) {
  
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getFocusScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getTrendDirection = () => {
    if (weeklyTrend.length < 2) return '→';
    const recent = weeklyTrend.slice(-2);
    if (recent[1] > recent[0]) return '↗';
    if (recent[1] < recent[0]) return '↘';
    return '→';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Today's Focus Time */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">Today's Focus Time</h3>
          <div className="text-2xl">🎯</div>
        </div>
        <div className="text-2xl font-bold text-white">
          {formatTime(todayFocusTime)}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          {Math.round(todayFocusTime / 60)} minutes focused
        </div>
      </div>

      {/* Total Sessions */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">Sessions Today</h3>
          <div className="text-2xl">📊</div>
        </div>
        <div className="text-2xl font-bold text-white">
          {totalSessions}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          focus sessions completed
        </div>
      </div>

      {/* Average Session Length */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">Avg Session</h3>
          <div className="text-2xl">⏱️</div>
        </div>
        <div className="text-2xl font-bold text-white">
          {formatTime(averageSessionLength)}
        </div>
        <div className="text-sm text-gray-500 mt-1">
          average length
        </div>
      </div>

      {/* Focus Score */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-400">Focus Score</h3>
          <div className="text-2xl">{getTrendDirection()}</div>
        </div>
        <div className={`text-2xl font-bold ${getFocusScoreColor(focusScore)}`}>
          {focusScore}%
        </div>
        <div className="text-sm text-gray-500 mt-1">
          productivity rating
        </div>
      </div>

      {/* Weekly Focus Trend */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 md:col-span-2 lg:col-span-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Weekly Focus Trend</h3>
          <div className="text-sm text-gray-400">Last 7 days</div>
        </div>
        
        <div className="flex items-end space-x-2 h-32">
          {weeklyTrend.map((time, index) => {
            const maxTime = Math.max(...weeklyTrend);
            const height = maxTime > 0 ? (time / maxTime) * 100 : 0;
            const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            const dayIndex = (new Date().getDay() - weeklyTrend.length + index + 7) % 7;
            
            return (
              <div key={index} className="flex flex-col items-center flex-1">
                <div 
                  className="w-full bg-blue-500 rounded-t transition-all duration-300 hover:bg-blue-400"
                  style={{ height: `${height}%` }}
                  title={`${dayNames[dayIndex]}: ${formatTime(time)}`}
                />
                <div className="text-xs text-gray-500 mt-2">
                  {dayNames[dayIndex]}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="flex justify-between text-sm text-gray-500 mt-4">
          <span>Total: {formatTime(weeklyTrend.reduce((sum, time) => sum + time, 0))}</span>
          <span>Avg: {formatTime(Math.round(weeklyTrend.reduce((sum, time) => sum + time, 0) / 7))}/day</span>
        </div>
      </div>
    </div>
  );
}