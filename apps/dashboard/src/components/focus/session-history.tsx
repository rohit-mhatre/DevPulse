'use client';

import React from 'react';

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

interface SessionHistoryProps {
  sessions: FocusSession[];
  onDeleteSession?: (id: string) => void;
}

export function SessionHistory({ sessions, onDeleteSession }: SessionHistoryProps) {
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDateTime = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getSessionTypeIcon = (type: FocusSession['type']) => {
    switch (type) {
      case 'deep-work': return '🧠';
      case 'code-review': return '👀';
      case 'learning': return '📚';
      case 'meeting-prep': return '📝';
      default: return '🎯';
    }
  };

  const getSessionTypeName = (type: FocusSession['type']) => {
    switch (type) {
      case 'deep-work': return 'Deep Work';
      case 'code-review': return 'Code Review';
      case 'learning': return 'Learning';
      case 'meeting-prep': return 'Meeting Prep';
      default: return 'Focus Session';
    }
  };

  const getFocusScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSessionStatusBadge = (session: FocusSession) => {
    if (session.completed) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900 text-green-300">
          ✓ Completed
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900 text-red-300">
          ✗ Interrupted
        </span>
      );
    }
  };

  if (sessions.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-8 border border-gray-700 text-center">
        <div className="text-6xl mb-4">🎯</div>
        <h3 className="text-xl font-semibold text-white mb-2">No Focus Sessions Yet</h3>
        <p className="text-gray-400">
          Start your first focus session to see your productivity history here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/50 rounded-xl border border-gray-700">
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Session History</h3>
          <div className="text-sm text-gray-400">
            {sessions.length} session{sessions.length !== 1 ? 's' : ''} total
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-700">
        {sessions.map((session) => (
          <div key={session.id} className="p-6 hover:bg-gray-800/30 transition-colors">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="text-2xl">
                  {getSessionTypeIcon(session.type)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-medium text-white">
                      {getSessionTypeName(session.type)}
                    </h4>
                    {getSessionStatusBadge(session)}
                  </div>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-400 mb-3">
                    <span className="flex items-center space-x-1">
                      <span>⏱️</span>
                      <span>{formatTime(session.duration)}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span>📅</span>
                      <span>{formatDateTime(session.startTime)}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <span>🎯</span>
                      <span className={getFocusScoreColor(session.focusScore)}>
                        {session.focusScore}%
                      </span>
                    </span>
                    {session.distractions > 0 && (
                      <span className="flex items-center space-x-1 text-orange-400">
                        <span>⚠️</span>
                        <span>{session.distractions} distraction{session.distractions !== 1 ? 's' : ''}</span>
                      </span>
                    )}
                  </div>

                  {/* Progress bar showing completion */}
                  <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        session.completed ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{ 
                        width: session.completed ? '100%' : `${(session.focusScore / 100) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>

              {onDeleteSession && (
                <button
                  onClick={() => onDeleteSession(session.id)}
                  className="text-gray-500 hover:text-red-400 transition-colors p-1"
                  title="Delete session"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}