'use client';

import { useState, useEffect } from 'react';
import { Target, Play, Clock, TrendingUp, Focus, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface FocusSession {
  id: string;
  type: string;
  duration: number;
  startTime: number;
  endTime?: number;
  pausedTime: number;
  isActive: boolean;
  isPaused: boolean;
  productivityScore?: number;
}

export function FocusWidget() {
  const [currentSession, setCurrentSession] = useState<FocusSession | null>(null);
  const [todaySessions, setTodaySessions] = useState<FocusSession[]>([]);
  const [todayFocusTime, setTodayFocusTime] = useState(0);

  useEffect(() => {
    const loadFocusData = () => {
      // Load current session if exists
      const savedCurrentSession = localStorage.getItem('devpulse-current-focus-session');
      if (savedCurrentSession) {
        try {
          const session = JSON.parse(savedCurrentSession);
          if (session.isActive) {
            setCurrentSession(session);
          }
        } catch (error) {
          console.error('Failed to load current session:', error);
        }
      }

      // Load all sessions and filter today's
      const savedSessions = localStorage.getItem('devpulse-focus-sessions');
      if (savedSessions) {
        try {
          const sessions = JSON.parse(savedSessions);
          const today = new Date();
          const todaysSessions = sessions.filter((session: FocusSession) => {
            const sessionDate = new Date(session.startTime);
            return sessionDate.toDateString() === today.toDateString();
          });
          
          setTodaySessions(todaysSessions);
          
          // Calculate today's total focus time
          const totalTime = todaysSessions.reduce((total: number, session: FocusSession) => {
            if (session.endTime) {
              return total + (session.endTime - session.startTime - session.pausedTime);
            }
            return total;
          }, 0);
          
          setTodayFocusTime(totalTime);
        } catch (error) {
          console.error('Failed to load focus sessions:', error);
        }
      }
    };

    loadFocusData();
    const interval = setInterval(loadFocusData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (milliseconds: number): string => {
    const totalMinutes = Math.floor(milliseconds / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const getTimeRemaining = (): number => {
    if (!currentSession) return 0;
    
    const now = Date.now();
    let elapsed = Math.floor((now - currentSession.startTime) / 1000);
    elapsed -= Math.floor(currentSession.pausedTime / 1000);
    
    return Math.max(0, currentSession.duration - elapsed);
  };

  const getSessionProgress = (): number => {
    if (!currentSession) return 0;
    
    const timeRemaining = getTimeRemaining();
    return Math.min(100, ((currentSession.duration - timeRemaining) / currentSession.duration) * 100);
  };

  const averageScore = todaySessions.length > 0 
    ? Math.round(todaySessions.reduce((sum, session) => sum + (session.productivityScore || 0), 0) / todaySessions.length)
    : 0;

  // If there's an active session, show the active session widget
  if (currentSession?.isActive) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Focus Session Active</h3>
              <p className="text-sm text-gray-600 capitalize">
                {currentSession.type.replace('-', ' ')}
              </p>
            </div>
          </div>
          {currentSession.isPaused && (
            <div className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
              Paused
            </div>
          )}
        </div>

        {/* Timer Display */}
        <div className="text-center mb-4">
          <div className="text-3xl font-mono font-bold text-gray-900 mb-1">
            {Math.floor(getTimeRemaining() / 60)}:{(getTimeRemaining() % 60).toString().padStart(2, '0')}
          </div>
          <div className="text-sm text-gray-500">remaining</div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-1000 ${
                currentSession.isPaused ? 'bg-yellow-500' : 'bg-green-500'
              }`}
              style={{ width: `${getSessionProgress()}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{Math.round(getSessionProgress())}% complete</span>
            <span>{Math.floor(currentSession.duration / 60)}m total</span>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center p-2 bg-gray-50 rounded">
            <p className="text-lg font-bold text-gray-900">{todaySessions.length}</p>
            <p className="text-xs text-gray-500">Today's Sessions</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <p className="text-lg font-bold text-gray-900">{formatDuration(todayFocusTime)}</p>
            <p className="text-xs text-gray-500">Total Focus</p>
          </div>
        </div>

        {/* Action */}
        <Link
          href="/focus"
          className="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
        >
          <span>Manage Session</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // If no active session, show the summary widget
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Focus className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Focus Sessions</h3>
            <p className="text-sm text-gray-600">Today's productivity</p>
          </div>
        </div>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <Clock className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{formatDuration(todayFocusTime)}</p>
          <p className="text-xs text-gray-500">Focus Time</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center space-x-1 mb-1">
            <Target className="w-4 h-4 text-gray-500" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{todaySessions.length}</p>
          <p className="text-xs text-gray-500">Sessions</p>
        </div>
      </div>

      {/* Productivity Score */}
      {todaySessions.length > 0 && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">Avg Productivity</span>
            </div>
            <span className={`text-lg font-bold ${
              averageScore >= 80 ? 'text-green-600' :
              averageScore >= 60 ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {averageScore}%
            </span>
          </div>
        </div>
      )}

      {/* Recent Session or Empty State */}
      {todaySessions.length > 0 ? (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Latest Session</h4>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 capitalize">
                  {todaySessions[0].type.replace('-', ' ')}
                </p>
                <p className="text-xs text-gray-500">
                  {todaySessions[0].endTime 
                    ? formatDuration(todaySessions[0].endTime - todaySessions[0].startTime - todaySessions[0].pausedTime)
                    : 'In Progress'
                  }
                </p>
              </div>
              {todaySessions[0].productivityScore !== undefined && (
                <div className="text-right">
                  <p className={`text-sm font-medium ${
                    todaySessions[0].productivityScore >= 80 ? 'text-green-600' :
                    todaySessions[0].productivityScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {todaySessions[0].productivityScore}%
                  </p>
                  <p className="text-xs text-gray-500">score</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-4 text-center py-3">
          <Play className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No focus sessions today</p>
          <p className="text-xs text-gray-400">Start your first session!</p>
        </div>
      )}

      {/* Action Button */}
      <Link
        href="/focus"
        className="flex items-center justify-center space-x-2 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
      >
        <Play className="w-4 h-4" />
        <span>Start Focus Session</span>
      </Link>
    </div>
  );
}