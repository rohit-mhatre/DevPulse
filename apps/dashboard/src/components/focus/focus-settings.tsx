'use client';

import React, { useState } from 'react';

interface FocusSettingsProps {
  settings: {
    defaultDuration: number;
    breakReminders: boolean;
    soundAlerts: boolean;
    distractionBlocking: boolean;
    autoStartBreaks: boolean;
    focusGoalDaily: number; // in minutes
    focusGoalWeekly: number; // in minutes
  };
  onSettingsUpdate: (settings: any) => void;
}

export function FocusSettings({ settings, onSettingsUpdate }: FocusSettingsProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  
  const handleSettingChange = (key: string, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsUpdate(newSettings);
  };

  const durationPresets = [
    { label: '25 min (Pomodoro)', value: 25 * 60 },
    { label: '45 min (Focus)', value: 45 * 60 },
    { label: '90 min (Deep Work)', value: 90 * 60 },
    { label: '120 min (Extended)', value: 120 * 60 },
  ];

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min`;
  };

  return (
    <div className="space-y-8">
      {/* Session Duration */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Default Session Duration</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {durationPresets.map((preset) => (
            <button
              key={preset.value}
              onClick={() => handleSettingChange('defaultDuration', preset.value)}
              className={`p-3 rounded-lg border transition-all ${
                localSettings.defaultDuration === preset.value
                  ? 'border-blue-500 bg-blue-500/20 text-blue-300'
                  : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
              }`}
            >
              <div className="text-sm font-medium">{preset.label}</div>
            </button>
          ))}
        </div>

        <div className="flex items-center space-x-4">
          <label className="text-sm text-gray-400">Custom Duration:</label>
          <input
            type="range"
            min="5"
            max="180"
            step="5"
            value={localSettings.defaultDuration / 60}
            onChange={(e) => handleSettingChange('defaultDuration', parseInt(e.target.value) * 60)}
            className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="text-sm text-white font-mono min-w-16">
            {formatTime(localSettings.defaultDuration)}
          </div>
        </div>
      </div>

      {/* Notifications & Alerts */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Notifications & Alerts</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-white font-medium">Break Reminders</label>
              <p className="text-sm text-gray-400">Get notified when it's time for a break</p>
            </div>
            <button
              onClick={() => handleSettingChange('breakReminders', !localSettings.breakReminders)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localSettings.breakReminders ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localSettings.breakReminders ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-white font-medium">Sound Alerts</label>
              <p className="text-sm text-gray-400">Play audio notifications for session events</p>
            </div>
            <button
              onClick={() => handleSettingChange('soundAlerts', !localSettings.soundAlerts)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localSettings.soundAlerts ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localSettings.soundAlerts ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-white font-medium">Distraction Blocking</label>
              <p className="text-sm text-gray-400">Show warnings when non-productive apps are detected</p>
            </div>
            <button
              onClick={() => handleSettingChange('distractionBlocking', !localSettings.distractionBlocking)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localSettings.distractionBlocking ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localSettings.distractionBlocking ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-white font-medium">Auto-Start Breaks</label>
              <p className="text-sm text-gray-400">Automatically start break timer when session ends</p>
            </div>
            <button
              onClick={() => handleSettingChange('autoStartBreaks', !localSettings.autoStartBreaks)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localSettings.autoStartBreaks ? 'bg-blue-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localSettings.autoStartBreaks ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Focus Goals */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Focus Goals</h3>
        
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-white font-medium">Daily Focus Goal</label>
              <span className="text-sm text-blue-400">{localSettings.focusGoalDaily} minutes</span>
            </div>
            <input
              type="range"
              min="30"
              max="480"
              step="15"
              value={localSettings.focusGoalDaily}
              onChange={(e) => handleSettingChange('focusGoalDaily', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>30 min</span>
              <span>4 hours</span>
              <span>8 hours</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-white font-medium">Weekly Focus Goal</label>
              <span className="text-sm text-blue-400">
                {Math.round(localSettings.focusGoalWeekly / 60)} hours
              </span>
            </div>
            <input
              type="range"
              min="300"
              max="2400"
              step="60"
              value={localSettings.focusGoalWeekly}
              onChange={(e) => handleSettingChange('focusGoalWeekly', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>5 hours</span>
              <span>20 hours</span>
              <span>40 hours</span>
            </div>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
          <div className="flex items-start space-x-2">
            <div className="text-blue-400 text-sm">💡</div>
            <div className="text-sm text-blue-300">
              <strong>Tip:</strong> Research shows that focused work sessions of 25-90 minutes 
              followed by short breaks are most effective for maintaining productivity.
            </div>
          </div>
        </div>
      </div>

      {/* Reset Options */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-4">Data Management</h3>
        
        <div className="space-y-4">
          <button className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-left transition-colors">
            <div className="text-white font-medium">Export Session Data</div>
            <div className="text-sm text-gray-400">Download your focus session history as CSV</div>
          </button>
          
          <button className="w-full p-3 bg-red-900/20 hover:bg-red-900/30 border border-red-800 rounded-lg text-left transition-colors">
            <div className="text-red-300 font-medium">Reset All Sessions</div>
            <div className="text-sm text-red-400">Clear all focus session data (cannot be undone)</div>
          </button>
        </div>
      </div>
    </div>
  );
}