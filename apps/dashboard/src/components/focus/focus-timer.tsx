'use client';

import React, { useState, useEffect } from 'react';

interface FocusTimerProps {
  duration: number; // in seconds
  isActive: boolean;
  onTimeUpdate: (remainingTime: number) => void;
  onComplete: () => void;
}

export function FocusTimer({ duration, isActive, onTimeUpdate, onComplete }: FocusTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration);

  useEffect(() => {
    setTimeRemaining(duration);
  }, [duration]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isActive && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((time) => {
          const newTime = time - 1;
          onTimeUpdate(newTime);
          
          if (newTime <= 0) {
            onComplete();
            return 0;
          }
          
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, timeRemaining, onTimeUpdate, onComplete]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = ((duration - timeRemaining) / duration) * 100;

  return (
    <div className="flex flex-col items-center space-y-6">
      {/* Circular Progress */}
      <div className="relative w-48 h-48">
        <svg className="w-48 h-48 transform -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgb(31 41 55)"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgb(59 130 246)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
            className="transition-all duration-1000 ease-in-out"
          />
        </svg>
        
        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-mono font-bold text-white">
            {formatTime(timeRemaining)}
          </div>
          <div className="text-sm text-gray-400 mt-1">
            {formatTime(duration - timeRemaining)} elapsed
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-md">
        <div className="w-full bg-gray-800 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-sm text-gray-400 mt-2">
          <span>Start</span>
          <span>{Math.round(progress)}% complete</span>
          <span>End</span>
        </div>
      </div>
    </div>
  );
}