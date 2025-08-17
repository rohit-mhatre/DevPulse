'use client';

import React from 'react';
import Link from 'next/link';

interface FocusWidgetProps {
  todayFocusTime: number;
  isSessionActive: boolean;
  focusScore: number;
  dailyGoal: number;
}

export function FocusWidget({ 
  todayFocusTime, 
  isSessionActive, 
  focusScore, 
  dailyGoal 
}: FocusWidgetProps) {
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 60);
    const minutes = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const progressPercentage = Math.min((todayFocusTime / dailyGoal) * 100, 100);

  const getFocusScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="text-2xl">🎯</div>
          <h3 className="text-lg font-semibold text-white">Focus Sessions</h3>
        </div>
        
        {isSessionActive && (
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-green-400 font-medium">Active</span>
          </div>
        )}
      </div>

      {/* Progress towards daily goal */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-400">Daily Focus Goal</span>
          <span className="text-white font-medium">
            {formatTime(todayFocusTime)} / {formatTime(dailyGoal)}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Focus Score */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-gray-400">Today's Focus Score</span>
        <span className={`text-lg font-bold ${getFocusScoreColor(focusScore)}`}>
          {focusScore}%
        </span>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-center">
        <div className="p-3 bg-gray-700/50 rounded-lg">
          <div className="text-lg font-bold text-white">
            {Math.round(progressPercentage)}%
          </div>
          <div className="text-xs text-gray-400">Goal Progress</div>
        </div>
        <div className="p-3 bg-gray-700/50 rounded-lg">
          <div className="text-lg font-bold text-white">
            {formatTime(todayFocusTime)}
          </div>
          <div className="text-xs text-gray-400">Focused Today</div>
        </div>
      </div>

      {/* Action Button */}
      <Link 
        href="/focus" 
        className="block w-full"
      >
        <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-lg transition-colors">
          {isSessionActive ? '⏸️ Manage Session' : '🚀 Start Focus Session'}
        </button>
      </Link>

      {/* Quick Tips */}
      <div className="mt-4 p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
        <div className="flex items-start space-x-2">
          <div className="text-blue-400 text-sm">💡</div>
          <div className="text-xs text-blue-300">
            {progressPercentage >= 100 ? (
              <span><strong>Goal achieved!</strong> Great job staying focused today.</span>
            ) : progressPercentage >= 50 ? (
              <span><strong>Halfway there!</strong> Keep up the momentum.</span>
            ) : (
              <span><strong>Tip:</strong> Try 25-minute Pomodoro sessions for better focus.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}