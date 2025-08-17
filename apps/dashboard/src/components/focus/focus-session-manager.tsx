'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FocusTimer } from './focus-timer';
import { FocusStats } from './focus-stats';
import { SessionHistory } from './session-history';
import { FocusSettings } from './focus-settings';

interface FocusSession {
  id: string;
  type: 'deep-work' | 'code-review' | 'learning' | 'meeting-prep';
  duration: number;
  startTime: Date;
  endTime: Date;
  focusScore: number;
  completed: boolean;
  distractions: number;
}

interface FocusSettings {
  defaultDuration: number;
  breakReminders: boolean;
  soundAlerts: boolean;
  distractionBlocking: boolean;
  autoStartBreaks: boolean;
  focusGoalDaily: number;
  focusGoalWeekly: number;
}

export function FocusSessionManager() {
  const [currentSession, setCurrentSession] = useState<{
    id: string;
    type: 'deep-work' | 'code-review' | 'learning' | 'meeting-prep';
    duration: number;
    startTime: Date;
    isActive: boolean;
    isPaused: boolean;
  } | null>(null);

  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const [activeTab, setActiveTab] = useState<'session' | 'stats' | 'history' | 'settings'>('session');
  const [activityData, setActivityData] = useState<any[]>([]);

  const [settings, setSettings] = useState<FocusSettings>({
    defaultDuration: 25 * 60, // 25 minutes
    breakReminders: true,
    soundAlerts: true,
    distractionBlocking: true,
    autoStartBreaks: false,
    focusGoalDaily: 240, // 4 hours
    focusGoalWeekly: 1200, // 20 hours
  });

  // Load sessions from localStorage
  useEffect(() => {
    const savedSessions = localStorage.getItem('devpulse-focus-sessions');
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed.map((s: any) => ({
        ...s,
        startTime: new Date(s.startTime),
        endTime: new Date(s.endTime),
      })));
    }

    const savedSettings = localStorage.getItem('devpulse-focus-settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  // Fetch activity data
  useEffect(() => {
    const fetchActivityData = async () => {
      try {
        const response = await fetch('/api/activity');
        if (response.ok) {
          const data = await response.json();
          setActivityData(data.activities || []);
        }
      } catch (error) {
        console.error('Failed to fetch activity data:', error);
      }
    };

    fetchActivityData();
    const interval = setInterval(fetchActivityData, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, []);

  // Listen for distraction warnings from desktop app
  useEffect(() => {
    if (typeof window !== 'undefined' && window.electron) {
      const handleDistractionWarning = (data: any) => {
        console.log('Distraction warning received:', data);
        
        // Show a visual alert in the dashboard
        const alertElement = document.createElement('div');
        alertElement.className = 'fixed top-4 right-4 bg-yellow-600 text-white p-4 rounded-lg shadow-lg z-50';
        alertElement.innerHTML = `
          <div class="flex items-center space-x-2">
            <span class="text-2xl">⚠️</span>
            <div>
              <div class="font-bold">Focus Mode Alert</div>
              <div class="text-sm">Distraction detected: ${data.appName}</div>
            </div>
          </div>
        `;
        
        document.body.appendChild(alertElement);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
          if (document.body.contains(alertElement)) {
            document.body.removeChild(alertElement);
          }
        }, 5000);
      };

      window.electron.on('distraction-warning', handleDistractionWarning);

      return () => {
        window.electron?.removeAllListeners('distraction-warning');
      };
    }
  }, []);

  // Save sessions to localStorage
  const saveSessions = useCallback((newSessions: FocusSession[]) => {
    localStorage.setItem('devpulse-focus-sessions', JSON.stringify(newSessions));
    setSessions(newSessions);
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: FocusSettings) => {
    localStorage.setItem('devpulse-focus-settings', JSON.stringify(newSettings));
    setSettings(newSettings);
  }, []);

  const startSession = async (type: 'deep-work' | 'code-review' | 'learning' | 'meeting-prep', duration?: number) => {
    const sessionDuration = duration || settings.defaultDuration;
    const sessionId = Date.now().toString();
    const newSession = {
      id: sessionId,
      type,
      duration: sessionDuration,
      startTime: new Date(),
      isActive: true,
      isPaused: false,
    };

    // Try to start focus mode in desktop app
    try {
      const result = await window.electron?.invoke('focus-start-session', sessionId);
      if (result?.success) {
        console.log('Focus mode enabled in desktop app');
      } else {
        console.warn('Could not start focus mode in desktop app:', result?.error);
      }
    } catch (error) {
      console.warn('Desktop app integration not available:', error);
    }

    setCurrentSession(newSession);

    // Play sound if enabled
    if (settings.soundAlerts) {
      playNotificationSound('start');
    }
  };

  const pauseSession = () => {
    if (currentSession) {
      setCurrentSession({ ...currentSession, isPaused: !currentSession.isPaused });
    }
  };

  const stopSession = async (completed = true) => {
    if (!currentSession) return;

    // Try to end focus mode in desktop app and get stats
    let desktopStats = { warnings: 0, duration: 0 };
    try {
      const result = await window.electron?.invoke('focus-end-session');
      if (result?.success) {
        desktopStats = result.stats || desktopStats;
        console.log('Focus mode disabled in desktop app, stats:', desktopStats);
      } else {
        console.warn('Could not end focus mode in desktop app:', result?.error);
      }
    } catch (error) {
      console.warn('Desktop app integration not available:', error);
    }

    const endTime = new Date();
    const actualDuration = Math.floor((endTime.getTime() - currentSession.startTime.getTime()) / 1000);
    
    // Calculate focus score based on activity data and desktop stats
    const focusScore = calculateFocusScore(currentSession.startTime, endTime, desktopStats.warnings);
    
    const finishedSession: FocusSession = {
      id: currentSession.id,
      type: currentSession.type,
      duration: actualDuration,
      startTime: currentSession.startTime,
      endTime,
      focusScore,
      completed,
      distractions: desktopStats.warnings || calculateDistractions(currentSession.startTime, endTime),
    };

    const newSessions = [finishedSession, ...sessions];
    saveSessions(newSessions);
    setCurrentSession(null);

    // Play sound if enabled
    if (settings.soundAlerts) {
      playNotificationSound(completed ? 'complete' : 'stop');
    }

    // Show break reminder if enabled
    if (completed && settings.breakReminders) {
      showBreakReminder();
    }
  };

  const calculateFocusScore = (startTime: Date, endTime: Date, distractionWarnings = 0): number => {
    // Filter activities during session
    const sessionActivities = activityData.filter(activity => {
      const activityTime = new Date(activity.timestamp);
      return activityTime >= startTime && activityTime <= endTime;
    });

    if (sessionActivities.length === 0) return 75; // Default score

    // Calculate productive time vs total time
    const productiveTypes = ['code', 'research', 'design', 'document'];
    const productiveTime = sessionActivities
      .filter(activity => productiveTypes.includes(activity.activity_type))
      .reduce((sum, activity) => sum + activity.duration_seconds, 0);

    const totalTime = sessionActivities.reduce((sum, activity) => sum + activity.duration_seconds, 0);
    
    let baseScore = totalTime > 0 ? Math.round((productiveTime / totalTime) * 100) : 75;
    
    // Reduce score based on distraction warnings from desktop app
    const distractionPenalty = Math.min(distractionWarnings * 5, 30); // Max 30 point penalty
    const finalScore = Math.max(baseScore - distractionPenalty, 0);
    
    return finalScore;
  };

  const calculateDistractions = (startTime: Date, endTime: Date): number => {
    const sessionActivities = activityData.filter(activity => {
      const activityTime = new Date(activity.timestamp);
      return activityTime >= startTime && activityTime <= endTime;
    });

    // Count activities classified as 'browsing' or 'other' as distractions
    return sessionActivities.filter(activity => 
      ['browsing', 'other'].includes(activity.activity_type)
    ).length;
  };

  const playNotificationSound = (type: 'start' | 'complete' | 'stop') => {
    // Simple audio feedback using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'start') {
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
    } else if (type === 'complete') {
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.2);
    } else {
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    }

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.5);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  };

  const showBreakReminder = () => {
    if ('Notification' in window) {
      new Notification('Focus Session Complete! 🎉', {
        body: 'Great work! Time for a well-deserved break.',
        icon: '/favicon.ico'
      });
    }
  };

  const deleteSession = (sessionId: string) => {
    const newSessions = sessions.filter(s => s.id !== sessionId);
    saveSessions(newSessions);
  };

  // Calculate stats
  const todaysSessions = sessions.filter(session => {
    const today = new Date();
    const sessionDate = new Date(session.startTime);
    return sessionDate.toDateString() === today.toDateString();
  });

  const todayFocusTime = todaysSessions.reduce((sum, session) => sum + session.duration, 0);
  const totalSessions = todaysSessions.length;
  const averageSessionLength = totalSessions > 0 ? Math.round(todayFocusTime / totalSessions) : 0;
  const focusScore = todaysSessions.length > 0 
    ? Math.round(todaysSessions.reduce((sum, s) => sum + s.focusScore, 0) / todaysSessions.length)
    : 0;

  // Weekly trend data
  const weeklyTrend = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    
    return sessions
      .filter(session => {
        const sessionDate = new Date(session.startTime);
        return sessionDate >= dayStart && sessionDate < dayEnd;
      })
      .reduce((sum, session) => sum + session.duration, 0);
  });

  const sessionTypes = [
    { id: 'deep-work', label: 'Deep Work', icon: '🧠', description: 'Focused coding or complex problem-solving' },
    { id: 'code-review', label: 'Code Review', icon: '👀', description: 'Reviewing code, PRs, or documentation' },
    { id: 'learning', label: 'Learning', icon: '📚', description: 'Reading docs, tutorials, or research' },
    { id: 'meeting-prep', label: 'Meeting Prep', icon: '📝', description: 'Preparing for meetings or presentations' },
  ] as const;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">Focus Session Manager</h1>
        <p className="text-gray-400">Stay focused, track progress, build better habits</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-800/50 p-1 rounded-xl border border-gray-700">
        {([
          { id: 'session', label: 'Active Session', icon: '🎯' },
          { id: 'stats', label: 'Statistics', icon: '📊' },
          { id: 'history', label: 'History', icon: '📝' },
          { id: 'settings', label: 'Settings', icon: '⚙️' },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all flex-1 justify-center ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
            }`}
          >
            <span>{tab.icon}</span>
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'session' && (
        <div className="space-y-8">
          {!currentSession ? (
            /* Session Setup */
            <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700 text-center">
              <h2 className="text-2xl font-semibold text-white mb-6">Start a Focus Session</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto mb-8">
                {sessionTypes.map(type => (
                  <button
                    key={type.id}
                    onClick={() => startSession(type.id)}
                    className="p-6 bg-gray-700/50 hover:bg-gray-600/50 rounded-xl border border-gray-600 hover:border-gray-500 transition-all text-left"
                  >
                    <div className="text-3xl mb-2">{type.icon}</div>
                    <div className="text-lg font-semibold text-white mb-1">{type.label}</div>
                    <div className="text-sm text-gray-400">{type.description}</div>
                  </button>
                ))}
              </div>

              <div className="text-sm text-gray-400">
                Default duration: {Math.round(settings.defaultDuration / 60)} minutes
              </div>
            </div>
          ) : (
            /* Active Session */
            <div className="space-y-8">
              <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700 text-center">
                <div className="flex items-center justify-center space-x-3 mb-6">
                  <span className="text-3xl">
                    {sessionTypes.find(t => t.id === currentSession.type)?.icon}
                  </span>
                  <h2 className="text-2xl font-semibold text-white">
                    {sessionTypes.find(t => t.id === currentSession.type)?.label}
                  </h2>
                  {currentSession.isPaused && (
                    <span className="px-3 py-1 bg-yellow-900 text-yellow-300 rounded-full text-sm font-medium">
                      Paused
                    </span>
                  )}
                </div>

                <FocusTimer
                  duration={currentSession.duration}
                  isActive={currentSession.isActive && !currentSession.isPaused}
                  onTimeUpdate={() => {}}
                  onComplete={() => stopSession(true)}
                />

                <div className="flex justify-center space-x-4 mt-8">
                  <button
                    onClick={pauseSession}
                    className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-white font-medium transition-colors"
                  >
                    {currentSession.isPaused ? '▶️ Resume' : '⏸️ Pause'}
                  </button>
                  <button
                    onClick={() => stopSession(false)}
                    className="px-6 py-3 bg-red-600 hover:bg-red-500 rounded-lg text-white font-medium transition-colors"
                  >
                    🛑 Stop Session
                  </button>
                </div>
              </div>

              {/* Session Context */}
              {settings.distractionBlocking && (
                <div className="bg-blue-900/20 border border-blue-800 rounded-xl p-4">
                  <div className="flex items-center space-x-2 text-blue-300">
                    <span>🛡️</span>
                    <span className="font-medium">Distraction blocking is active</span>
                  </div>
                  <div className="text-sm text-blue-200 mt-1">
                    You'll be alerted if non-productive apps are detected during your session.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'stats' && (
        <FocusStats
          todayFocusTime={todayFocusTime}
          totalSessions={totalSessions}
          averageSessionLength={averageSessionLength}
          focusScore={focusScore}
          weeklyTrend={weeklyTrend}
        />
      )}

      {activeTab === 'history' && (
        <SessionHistory sessions={sessions} onDeleteSession={deleteSession} />
      )}

      {activeTab === 'settings' && (
        <FocusSettings settings={settings} onSettingsUpdate={saveSettings} />
      )}
    </div>
  );
}