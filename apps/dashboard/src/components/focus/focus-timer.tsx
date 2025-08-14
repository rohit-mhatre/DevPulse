'use client';

import { useState, useEffect, useCallback } from 'react';
import { Play, Pause, Square, Coffee, AlertCircle, Volume2, VolumeX } from 'lucide-react';
import { FocusSession } from './focus-session-manager';

interface FocusTimerProps {
  session: FocusSession;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function FocusTimer({ session, onPause, onResume, onStop }: FocusTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(session.duration);
  const [pauseStartTime, setPauseStartTime] = useState<number | null>(null);
  const [showBreakReminder, setShowBreakReminder] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [lastNotificationTime, setLastNotificationTime] = useState(0);

  // Calculate elapsed time
  const getElapsedTime = useCallback(() => {
    const now = Date.now();
    let elapsed = Math.floor((now - session.startTime) / 1000);
    
    // Subtract paused time
    elapsed -= session.pausedTime;
    
    // If currently paused, don't include current pause time
    if (session.isPaused && pauseStartTime) {
      elapsed -= Math.floor((now - pauseStartTime) / 1000);
    }
    
    return Math.max(0, elapsed);
  }, [session.startTime, session.pausedTime, session.isPaused, pauseStartTime]);

  // Update timer every second
  useEffect(() => {
    if (!session.isActive) return;

    const interval = setInterval(() => {
      const elapsed = getElapsedTime();
      const remaining = session.duration - elapsed;
      
      setTimeRemaining(Math.max(0, remaining));
      
      // Check for session completion
      if (remaining <= 0 && session.isActive) {
        playSound('completion');
        setShowBreakReminder(true);
        onStop();
      }
      
      // Break reminders every 25 minutes for long sessions
      if (session.duration > 1800 && remaining > 0) { // 30+ minute sessions
        const reminderInterval = 1500; // 25 minutes
        const elapsedMinutes = Math.floor(elapsed / 60);
        
        if (elapsedMinutes > 0 && elapsedMinutes % 25 === 0) {
          const notificationKey = Math.floor(elapsedMinutes / 25);
          if (notificationKey !== lastNotificationTime) {
            setLastNotificationTime(notificationKey);
            if (soundEnabled) {
              playSound('reminder');
            }
            // Show a brief break suggestion
            setShowBreakReminder(true);
            setTimeout(() => setShowBreakReminder(false), 5000);
          }
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [session, getElapsedTime, onStop, soundEnabled, lastNotificationTime]);

  // Handle pause state changes
  useEffect(() => {
    if (session.isPaused) {
      setPauseStartTime(Date.now());
    } else {
      if (pauseStartTime) {
        // Add the pause duration to total paused time
        const pauseDuration = Math.floor((Date.now() - pauseStartTime) / 1000);
        session.pausedTime += pauseDuration;
        setPauseStartTime(null);
      }
    }
  }, [session.isPaused, pauseStartTime]);

  const playSound = (type: 'start' | 'pause' | 'resume' | 'stop' | 'completion' | 'reminder') => {
    if (!soundEnabled) return;
    
    // Create audio context for Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Different frequencies for different sounds
      const frequencies = {
        start: 440,
        pause: 330,
        resume: 440,
        stop: 220,
        completion: 660,
        reminder: 550
      };
      
      oscillator.frequency.setValueAtTime(frequencies[type], audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Audio playback not supported:', error);
    }
  };

  const handlePause = () => {
    playSound('pause');
    onPause();
  };

  const handleResume = () => {
    playSound('resume');
    onResume();
  };

  const handleStop = () => {
    playSound('stop');
    onStop();
  };

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    const elapsed = getElapsedTime();
    return Math.min(100, (elapsed / session.duration) * 100);
  };

  const getStatusColor = (): string => {
    if (session.isPaused) return 'text-yellow-600';
    if (timeRemaining < 300) return 'text-red-600'; // Last 5 minutes
    if (timeRemaining < 600) return 'text-orange-600'; // Last 10 minutes
    return 'text-green-600';
  };

  const getProgressColor = (): string => {
    if (session.isPaused) return 'bg-yellow-500';
    if (timeRemaining < 300) return 'bg-red-500';
    if (timeRemaining < 600) return 'bg-orange-500';
    return 'bg-green-500';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      {/* Break Reminder Modal */}
      {showBreakReminder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-full">
                <Coffee className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Take a Break!</h3>
                <p className="text-sm text-gray-600">Consider a short break to maintain focus</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowBreakReminder(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Continue
              </button>
              <button
                onClick={() => {
                  setShowBreakReminder(false);
                  handlePause();
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Take Break
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Focus Timer</h3>
          <p className="text-sm text-gray-600 capitalize">
            {session.type.replace('-', ' ')} session
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title={soundEnabled ? 'Disable sounds' : 'Enable sounds'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Timer Display */}
      <div className="text-center mb-8">
        <div className={`text-6xl md:text-7xl font-mono font-bold ${getStatusColor()} mb-2`}>
          {formatTime(timeRemaining)}
        </div>
        <div className="text-sm text-gray-500">
          {session.isPaused ? 'Paused' : 'Remaining'}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{Math.round(getProgressPercentage())}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-1000 ${getProgressColor()}`}
            style={{ width: `${getProgressPercentage()}%` }}
          ></div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-900">
            {formatTime(getElapsedTime())}
          </p>
          <p className="text-xs text-gray-500">Elapsed</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-900">
            {formatTime(session.duration)}
          </p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-900">
            {formatTime(Math.floor(session.pausedTime / 1000))}
          </p>
          <p className="text-xs text-gray-500">Paused</p>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center space-x-3">
        {session.isPaused ? (
          <button
            onClick={handleResume}
            className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <Play className="w-5 h-5" />
            <span>Resume</span>
          </button>
        ) : (
          <button
            onClick={handlePause}
            className="flex items-center space-x-2 px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
          >
            <Pause className="w-5 h-5" />
            <span>Pause</span>
          </button>
        )}
        
        <button
          onClick={handleStop}
          className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          <Square className="w-5 h-5" />
          <span>Stop</span>
        </button>
      </div>

      {/* Break Suggestions */}
      {!session.isPaused && getElapsedTime() > 1500 && ( // After 25 minutes
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <p className="text-sm text-blue-800">
              Consider taking a short break to maintain optimal focus
            </p>
          </div>
        </div>
      )}
    </div>
  );
}