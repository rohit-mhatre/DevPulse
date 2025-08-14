'use client';

import { useState, useEffect } from 'react';
import { 
  Volume2, 
  VolumeX, 
  Bell, 
  BellOff, 
  Coffee, 
  Clock, 
  Target, 
  AlertTriangle,
  Save,
  RotateCcw
} from 'lucide-react';

interface FocusSettings {
  soundEnabled: boolean;
  breakReminders: boolean;
  autoBreakDuration: number; // minutes
  distractionAlerts: boolean;
  focusThreshold: number; // percentage
  customPresets: SessionPreset[];
  dailyGoal: number; // minutes
  weeklyGoal: number; // minutes
}

interface SessionPreset {
  name: string;
  duration: number; // minutes
  type: string;
  shortBreak: number;
  longBreak: number;
}

const DEFAULT_SETTINGS: FocusSettings = {
  soundEnabled: true,
  breakReminders: true,
  autoBreakDuration: 25,
  distractionAlerts: true,
  focusThreshold: 70,
  customPresets: [],
  dailyGoal: 120, // 2 hours
  weeklyGoal: 600, // 10 hours
};

export function FocusSettings() {
  const [settings, setSettings] = useState<FocusSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);
  const [newPreset, setNewPreset] = useState<Partial<SessionPreset>>({
    name: '',
    duration: 25,
    type: 'deep-work',
    shortBreak: 5,
    longBreak: 15,
  });
  const [showAddPreset, setShowAddPreset] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('devpulse-focus-settings');
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings });
      } catch (error) {
        console.error('Failed to load focus settings:', error);
      }
    }
  }, []);

  const saveSettings = () => {
    localStorage.setItem('devpulse-focus-settings', JSON.stringify(settings));
    setHasChanges(false);
  };

  const resetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
  };

  const updateSetting = <K extends keyof FocusSettings>(
    key: K,
    value: FocusSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const addCustomPreset = () => {
    if (!newPreset.name || !newPreset.duration) return;

    const preset: SessionPreset = {
      name: newPreset.name,
      duration: newPreset.duration,
      type: newPreset.type || 'deep-work',
      shortBreak: newPreset.shortBreak || 5,
      longBreak: newPreset.longBreak || 15,
    };

    updateSetting('customPresets', [...settings.customPresets, preset]);
    setNewPreset({
      name: '',
      duration: 25,
      type: 'deep-work',
      shortBreak: 5,
      longBreak: 15,
    });
    setShowAddPreset(false);
  };

  const removeCustomPreset = (index: number) => {
    const updatedPresets = settings.customPresets.filter((_, i) => i !== index);
    updateSetting('customPresets', updatedPresets);
  };

  const testSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.warn('Audio test failed:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Save/Reset */}
      {hasChanges && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">You have unsaved changes</span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={resetSettings}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
              <button
                onClick={saveSettings}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audio & Notifications */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Audio & Notifications</h3>
        
        <div className="space-y-4">
          {/* Sound Settings */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {settings.soundEnabled ? (
                <Volume2 className="w-5 h-5 text-gray-600" />
              ) : (
                <VolumeX className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <label className="font-medium text-gray-900">Sound Effects</label>
                <p className="text-sm text-gray-600">Play sounds for session events</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={testSound}
                className="px-3 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
                disabled={!settings.soundEnabled}
              >
                Test
              </button>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => updateSetting('soundEnabled', e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${
                  settings.soundEnabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                    settings.soundEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}></div>
                </div>
              </label>
            </div>
          </div>

          {/* Break Reminders */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {settings.breakReminders ? (
                <Bell className="w-5 h-5 text-gray-600" />
              ) : (
                <BellOff className="w-5 h-5 text-gray-400" />
              )}
              <div>
                <label className="font-medium text-gray-900">Break Reminders</label>
                <p className="text-sm text-gray-600">
                  Suggest breaks every {settings.autoBreakDuration} minutes
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.breakReminders}
                onChange={(e) => updateSetting('breakReminders', e.target.checked)}
                className="sr-only"
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${
                settings.breakReminders ? 'bg-blue-600' : 'bg-gray-200'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  settings.breakReminders ? 'translate-x-5' : 'translate-x-0'
                }`}></div>
              </div>
            </label>
          </div>

          {/* Break Frequency */}
          {settings.breakReminders && (
            <div className="ml-8 space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Break reminder frequency
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="15"
                  max="60"
                  step="5"
                  value={settings.autoBreakDuration}
                  onChange={(e) => updateSetting('autoBreakDuration', parseInt(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-medium text-gray-900 w-16">
                  {settings.autoBreakDuration}m
                </span>
              </div>
            </div>
          )}

          {/* Distraction Alerts */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertTriangle className={`w-5 h-5 ${
                settings.distractionAlerts ? 'text-gray-600' : 'text-gray-400'
              }`} />
              <div>
                <label className="font-medium text-gray-900">Distraction Alerts</label>
                <p className="text-sm text-gray-600">Alert when non-productive apps are detected</p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.distractionAlerts}
                onChange={(e) => updateSetting('distractionAlerts', e.target.checked)}
                className="sr-only"
              />
              <div className={`w-11 h-6 rounded-full transition-colors ${
                settings.distractionAlerts ? 'bg-blue-600' : 'bg-gray-200'
              }`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  settings.distractionAlerts ? 'translate-x-5' : 'translate-x-0'
                }`}></div>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Focus Thresholds */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Focus Thresholds</h3>
        
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="font-medium text-gray-900">Minimum Focus Score</label>
              <span className="text-sm font-medium text-gray-900">{settings.focusThreshold}%</span>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Sessions below this score will be flagged as unfocused
            </p>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="50"
                max="90"
                step="5"
                value={settings.focusThreshold}
                onChange={(e) => updateSetting('focusThreshold', parseInt(e.target.value))}
                className="flex-1"
              />
              <div className="flex space-x-1 text-xs">
                <span className="text-red-600">50%</span>
                <span className="text-yellow-600">70%</span>
                <span className="text-green-600">90%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Daily & Weekly Goals */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Focus Goals</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium text-gray-900 mb-2">Daily Goal</label>
            <div className="flex items-center space-x-3">
              <Clock className="w-5 h-5 text-gray-500" />
              <input
                type="number"
                min="30"
                max="480"
                step="15"
                value={settings.dailyGoal}
                onChange={(e) => updateSetting('dailyGoal', parseInt(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-sm text-gray-600">minutes</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {Math.round(settings.dailyGoal / 60 * 10) / 10} hours per day
            </p>
          </div>

          <div>
            <label className="block font-medium text-gray-900 mb-2">Weekly Goal</label>
            <div className="flex items-center space-x-3">
              <Target className="w-5 h-5 text-gray-500" />
              <input
                type="number"
                min="200"
                max="2400"
                step="30"
                value={settings.weeklyGoal}
                onChange={(e) => updateSetting('weeklyGoal', parseInt(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-sm text-gray-600">minutes</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {Math.round(settings.weeklyGoal / 60 * 10) / 10} hours per week
            </p>
          </div>
        </div>
      </div>

      {/* Custom Presets */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Custom Session Presets</h3>
          <button
            onClick={() => setShowAddPreset(!showAddPreset)}
            className="px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Preset
          </button>
        </div>

        {/* Add New Preset Form */}
        {showAddPreset && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Create New Preset</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  value={newPreset.name}
                  onChange={(e) => setNewPreset(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Morning Focus"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="180"
                  value={newPreset.duration}
                  onChange={(e) => setNewPreset(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newPreset.type}
                  onChange={(e) => setNewPreset(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="deep-work">Deep Work</option>
                  <option value="code-review">Code Review</option>
                  <option value="learning">Learning</option>
                  <option value="meeting-prep">Meeting Prep</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Short Break (minutes)</label>
                <input
                  type="number"
                  min="3"
                  max="15"
                  value={newPreset.shortBreak}
                  onChange={(e) => setNewPreset(prev => ({ ...prev, shortBreak: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button
                onClick={() => setShowAddPreset(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addCustomPreset}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Add Preset
              </button>
            </div>
          </div>
        )}

        {/* Existing Custom Presets */}
        <div className="space-y-3">
          {settings.customPresets.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No custom presets yet. Create one above!</p>
          ) : (
            settings.customPresets.map((preset, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <h4 className="font-medium text-gray-900">{preset.name}</h4>
                  <p className="text-sm text-gray-600">
                    {preset.duration}m • {preset.type.replace('-', ' ')} • {preset.shortBreak}m breaks
                  </p>
                </div>
                <button
                  onClick={() => removeCustomPreset(index)}
                  className="px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}