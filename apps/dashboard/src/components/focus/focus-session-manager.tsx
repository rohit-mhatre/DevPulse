'use client';

import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Square, Coffee, Target, Clock, TrendingUp } from 'lucide-react';
import { FocusTimer } from './focus-timer';
import { FocusStats } from './focus-stats';
import { SessionHistory } from './session-history';
import { FocusSettings } from './focus-settings';

export interface FocusSession {
  id: string;
  type: SessionType;
  duration: number; // in seconds
  startTime: number;
  endTime?: number;
  pausedTime: number; // total paused duration
  isActive: boolean;
  isPaused: boolean;
  breaks: Break[];
  productivityScore?: number;
  activities: string[]; // activity types during session
}

export interface Break {
  startTime: number;
  endTime?: number;
  duration: number;
  type: 'short' | 'long';
}

export type SessionType = 'deep-work' | 'code-review' | 'learning' | 'meeting-prep';

export interface SessionPreset {
  name: string;
  duration: number; // in minutes
  type: SessionType;
  shortBreak: number; // in minutes
  longBreak: number; // in minutes
}

const DEFAULT_PRESETS: SessionPreset[] = [
  { name: 'Pomodoro', duration: 25, type: 'deep-work', shortBreak: 5, longBreak: 15 },
  { name: 'Deep Work', duration: 45, type: 'deep-work', shortBreak: 10, longBreak: 30 },
  { name: 'Extended Focus', duration: 90, type: 'deep-work', shortBreak: 15, longBreak: 30 },
  { name: 'Code Review', duration: 30, type: 'code-review', shortBreak: 5, longBreak: 15 },
  { name: 'Learning', duration: 60, type: 'learning', shortBreak: 10, longBreak: 20 },
  { name: 'Meeting Prep', duration: 20, type: 'meeting-prep', shortBreak: 5, longBreak: 10 },
];

export function FocusSessionManager() {
  const [currentSession, setCurrentSession] = useState<FocusSession | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<SessionPreset>(DEFAULT_PRESETS[0]);
  const [customDuration, setCustomDuration] = useState<number>(25);
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [activityData, setActivityData] = useState<any[]>([]);

  // Load sessions from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('devpulse-focus-sessions');
    if (saved) {
      try {
        setSessions(JSON.parse(saved));
      } catch (error) {
        console.error('Failed to load focus sessions:', error);
      }
    }
  }, []);

  // Save sessions to localStorage whenever sessions change
  useEffect(() => {
    localStorage.setItem('devpulse-focus-sessions', JSON.stringify(sessions));
  }, [sessions]);

  // Fetch activity data for correlation
  useEffect(() => {
    const fetchActivityData = async () => {
      try {
        const response = await fetch('/api/activity');
        const data = await response.json();
        if (!data.error) {
          setActivityData(data.activities || []);
        }
      } catch (error) {
        console.error('Failed to fetch activity data:', error);
      }
    };

    fetchActivityData();
    const interval = setInterval(fetchActivityData, 30000);
    return () => clearInterval(interval);
  }, []);

  const startSession = useCallback(() => {
    const newSession: FocusSession = {
      id: Date.now().toString(),
      type: selectedPreset.type,
      duration: selectedPreset.duration * 60, // Convert to seconds
      startTime: Date.now(),
      pausedTime: 0,
      isActive: true,
      isPaused: false,
      breaks: [],
      activities: [],
    };
    setCurrentSession(newSession);
  }, [selectedPreset]);

  const pauseSession = useCallback(() => {
    if (currentSession && !currentSession.isPaused) {
      setCurrentSession(prev => prev ? { ...prev, isPaused: true } : null);
    }
  }, [currentSession]);

  const resumeSession = useCallback(() => {
    if (currentSession && currentSession.isPaused) {
      setCurrentSession(prev => prev ? { ...prev, isPaused: false } : null);
    }
  }, [currentSession]);

  const stopSession = useCallback(() => {
    if (currentSession) {
      const endTime = Date.now();
      const completedSession: FocusSession = {
        ...currentSession,
        endTime,
        isActive: false,
        isPaused: false,
      };

      // Calculate productivity score based on activity correlation
      const sessionActivities = activityData.filter(activity => {
        const activityTime = new Date(activity.timestamp).getTime();
        return activityTime >= currentSession.startTime && activityTime <= endTime;
      });

      const productiveActivities = sessionActivities.filter(activity => 
        ['code', 'research', 'design'].includes(activity.activity_type)
      );

      const productivityScore = sessionActivities.length > 0 
        ? Math.round((productiveActivities.length / sessionActivities.length) * 100)
        : 0;

      completedSession.productivityScore = productivityScore;
      completedSession.activities = [...new Set(sessionActivities.map(a => a.activity_type))];

      setSessions(prev => [completedSession, ...prev]);
      setCurrentSession(null);
    }
  }, [currentSession, activityData]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getSessionTypeIcon = (type: SessionType) => {
    switch (type) {
      case 'deep-work': return <Target className="w-4 h-4" />;
      case 'code-review': return <TrendingUp className="w-4 h-4" />;
      case 'learning': return <Coffee className="w-4 h-4" />;
      case 'meeting-prep': return <Clock className="w-4 h-4" />;
      default: return <Target className="w-4 h-4" />;
    }
  };

  const getSessionTypeColor = (type: SessionType) => {
    switch (type) {
      case 'deep-work': return 'bg-blue-500';
      case 'code-review': return 'bg-green-500';
      case 'learning': return 'bg-purple-500';
      case 'meeting-prep': return 'bg-orange-500';
      default: return 'bg-blue-500';
    }
  };

  const todaySessions = sessions.filter(session => {
    const today = new Date();
    const sessionDate = new Date(session.startTime);
    return sessionDate.toDateString() === today.toDateString();
  });

  const totalFocusTimeToday = todaySessions.reduce((total, session) => {
    if (session.endTime) {
      return total + (session.endTime - session.startTime - session.pausedTime);
    }
    return total;
  }, 0);

  if (showHistory) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Focus Session History</h2>
          <button
            onClick={() => setShowHistory(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Back to Session
          </button>
        </div>
        <SessionHistory sessions={sessions} />
      </div>
    );
  }

  if (showSettings) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Focus Settings</h2>
          <button
            onClick={() => setShowSettings(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Back to Session
          </button>
        </div>
        <FocusSettings />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Focus Session Manager</h2>
          <p className="text-sm text-gray-600">
            Start a focus session to enhance your productivity and track deep work
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowHistory(true)}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            History
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Settings
          </button>
        </div>
      </div>

      {/* Current Session or Setup */}
      {currentSession ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Timer Section */}
          <FocusTimer
            session={currentSession}
            onPause={pauseSession}
            onResume={resumeSession}
            onStop={stopSession}
          />
          
          {/* Stats Section */}
          <FocusStats
            currentSession={currentSession}
            todaySessions={todaySessions}
            totalFocusTimeToday={totalFocusTimeToday}
            activityData={activityData}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Session Setup */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Start New Session</h3>
            
            {/* Session Type Selection */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Presets
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DEFAULT_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => setSelectedPreset(preset)}
                      className={`p-3 rounded-lg border-2 transition-all text-left ${
                        selectedPreset.name === preset.name
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1">
                        <div className={`p-1 rounded ${getSessionTypeColor(preset.type)} text-white`}>
                          {getSessionTypeIcon(preset.type)}
                        </div>
                        <span className="font-medium text-sm">{preset.name}</span>
                      </div>
                      <p className="text-xs text-gray-600">{preset.duration} minutes</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Duration (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={customDuration}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    setCustomDuration(value);
                    setSelectedPreset({
                      ...selectedPreset,
                      duration: value,
                      name: 'Custom'
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Start Button */}
              <button
                onClick={startSession}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
              >
                <Play className="w-5 h-5" />
                <span>Start Focus Session</span>
              </button>
            </div>
          </div>

          {/* Today's Stats */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Today's Focus</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-indigo-600">
                    {todaySessions.length}
                  </p>
                  <p className="text-xs text-gray-500">Sessions</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">
                    {formatDuration(Math.floor(totalFocusTimeToday / 1000))}
                  </p>
                  <p className="text-xs text-gray-500">Focus Time</p>
                </div>
              </div>

              {todaySessions.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Recent Sessions</h4>
                  <div className="space-y-2">
                    {todaySessions.slice(0, 3).map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center space-x-2">
                          <div className={`p-1 rounded ${getSessionTypeColor(session.type)} text-white`}>
                            {getSessionTypeIcon(session.type)}
                          </div>
                          <span className="text-sm font-medium capitalize">
                            {session.type.replace('-', ' ')}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            {session.endTime 
                              ? formatDuration(Math.floor((session.endTime - session.startTime) / 1000))
                              : 'In Progress'
                            }
                          </p>
                          {session.productivityScore !== undefined && (
                            <p className="text-xs text-gray-500">
                              {session.productivityScore}% productive
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}