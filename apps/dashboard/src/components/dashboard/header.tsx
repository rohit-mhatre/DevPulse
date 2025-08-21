'use client';

import { useState, useEffect } from 'react';
import { Bell, Settings, Search, Calendar, User, LogOut, Target, Github, BarChart3, Brain } from 'lucide-react';
import Link from 'next/link';
import { ExportWidget } from '@/components/export/export-widget';

interface DashboardHeaderProps {
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  activityData?: any[];
  stats?: any;
}

export function DashboardHeader({ selectedDate = new Date(), onDateChange, activityData = [], stats }: DashboardHeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [userName, setUserName] = useState('Local User');

  // Load user name from settings
  useEffect(() => {
    const savedSettings = localStorage.getItem('devpulse-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        if (settings.name) {
          setUserName(settings.name);
        }
      } catch (error) {
        console.error('Failed to parse saved settings:', error);
      }
    }
  }, []);

  // Generate real notifications based on activity data
  const generateNotifications = () => {
    const notifications = [];
    
    if (stats) {
      // Daily goal notifications
      const hoursWorked = Math.floor(stats.totalTime / 3600);
      if (hoursWorked >= 8) {
        notifications.push({
          type: 'success',
          title: 'Daily Goal Achieved! 🎉',
          message: `You've worked ${hoursWorked} hours today. Excellent productivity!`,
          time: '1 hour ago'
        });
      } else if (hoursWorked >= 4) {
        notifications.push({
          type: 'info',
          title: 'Good Progress Today',
          message: `${hoursWorked} hours logged. You're ${8 - hoursWorked} hours away from your daily goal.`,
          time: '30 minutes ago'
        });
      }

      // Activity type breakdown
      const codeTime = activityData
        .filter(a => a.activity_type === 'code')
        .reduce((sum, a) => sum + a.duration_seconds, 0);
      
      const browsingTime = activityData
        .filter(a => a.activity_type === 'browsing')
        .reduce((sum, a) => sum + a.duration_seconds, 0);

      if (codeTime > 0) {
        const codeHours = Math.floor(codeTime / 3600);
        const codeMinutes = Math.floor((codeTime % 3600) / 60);
        notifications.push({
          type: 'success',
          title: 'Coding Session Complete!',
          message: `${codeHours}h ${codeMinutes}m of focused coding time logged.`,
          time: '15 minutes ago'
        });
      }

      if (browsingTime > codeTime * 2) {
        notifications.push({
          type: 'warning',
          title: 'High Browsing Activity',
          message: 'Consider using focus mode to minimize distractions.',
          time: '45 minutes ago'
        });
      }
    }

    // Add a default notification if none exist
    if (notifications.length === 0) {
      notifications.push({
        type: 'info',
        title: 'DevPulse Active',
        message: 'Your activity is being tracked. Start coding to see insights!',
        time: 'Just now'
      });
    }

    return notifications;
  };

  const notifications = generateNotifications();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center space-x-3">
                <div className="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
                  <span className="text-white font-semibold text-xs">DP</span>
                </div>
                <span className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>DevPulse</span>
              </Link>
            </div>
            
            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              <Link 
                href="/"
                className="px-3 py-2 text-sm font-medium rounded-md transition-colors" 
                style={{ color: 'var(--text-primary)' }}
              >
                Dashboard
              </Link>
              <Link 
                href="/github"
                className="px-3 py-2 text-sm font-medium rounded-md transition-colors" 
                style={{ color: 'var(--text-secondary)' }}
              >
                GitHub
              </Link>
              <Link 
                href="/focus"
                className="px-3 py-2 text-sm font-medium rounded-md transition-colors" 
                style={{ color: 'var(--text-secondary)' }}
              >
                Focus
              </Link>
              <Link 
                href="/ai-analytics"
                className="px-3 py-2 text-sm font-medium rounded-md transition-colors" 
                style={{ color: 'var(--text-secondary)' }}
              >
                Analytics
              </Link>
            </nav>
          </div>

          {/* Search Bar */}
          <div className="hidden md:block flex-1 max-w-sm mx-6">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
              </div>
              <input
                type="text"
                className="block w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border-0 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                style={{ color: 'var(--text-primary)' }}
                placeholder="Search..."
              />
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-2">
            {/* Export Widget */}
            <ExportWidget className="hidden md:block" />
            
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors relative"
              >
                <Bell className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-10">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Notifications</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.map((notification, index) => {
                      const colorClass = notification.type === 'success' ? 'bg-green-500' 
                        : notification.type === 'warning' ? 'bg-yellow-500'
                        : 'bg-blue-500';
                      
                      return (
                        <div key={index} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start space-x-3">
                            <div className={`w-2 h-2 ${colorClass} rounded-full mt-2`}></div>
                            <div className="flex-1">
                              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{notification.title}</p>
                              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{notification.message}</p>
                              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{notification.time}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-4 py-2 border-t border-gray-100">
                    <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="relative">
              <button
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="p-2 rounded-md hover:bg-gray-100 transition-colors"
              >
                <Settings className="h-4 w-4" style={{ color: 'var(--text-tertiary)' }} />
              </button>

              {isSettingsOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Quick Settings</p>
                  </div>
                  <Link href="/settings?tab=focus" className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-50 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                    <Target className="h-4 w-4 mr-3" />
                    Focus Settings
                  </Link>
                  <Link href="/settings?tab=privacy" className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-50 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                    <BarChart3 className="h-4 w-4 mr-3" />
                    Privacy Settings
                  </Link>
                  <Link href="/settings?tab=notifications" className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-50 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                    <Bell className="h-4 w-4 mr-3" />
                    Notification Settings
                  </Link>
                  <hr className="my-1" />
                  <Link href="/settings" className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-50 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                    <Settings className="h-4 w-4 mr-3" />
                    All Settings
                  </Link>
                </div>
              )}
            </div>

            {/* Date Picker */}
            <div className="relative">
              <button
                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium bg-gray-100 rounded-md hover:bg-gray-200 transition-colors" 
                style={{ color: 'var(--text-secondary)' }}
              >
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:block">
                  {selectedDate.toDateString() === new Date().toDateString() 
                    ? 'Today' 
                    : selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </button>

              {isDatePickerOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-10">
                  <div className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Select Date</div>
                  
                  {/* Quick Date Options */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <button
                      onClick={() => {
                        onDateChange?.(new Date());
                        setIsDatePickerOpen(false);
                      }}
                      className="px-3 py-2 text-xs bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
                    >
                      Today
                    </button>
                    <button
                      onClick={() => {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        onDateChange?.(yesterday);
                        setIsDatePickerOpen(false);
                      }}
                      className="px-3 py-2 text-xs bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      Yesterday
                    </button>
                    <button
                      onClick={() => {
                        const lastWeek = new Date();
                        lastWeek.setDate(lastWeek.getDate() - 7);
                        onDateChange?.(lastWeek);
                        setIsDatePickerOpen(false);
                      }}
                      className="px-3 py-2 text-xs bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      Last Week
                    </button>
                    <button
                      onClick={() => {
                        const lastMonth = new Date();
                        lastMonth.setDate(lastMonth.getDate() - 30);
                        onDateChange?.(lastMonth);
                        setIsDatePickerOpen(false);
                      }}
                      className="px-3 py-2 text-xs bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
                    >
                      Last Month
                    </button>
                  </div>

                  {/* Date Input */}
                  <div className="border-t border-gray-100 pt-3">
                    <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Custom Date</label>
                    <input
                      type="date"
                      value={selectedDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        const newDate = new Date(e.target.value);
                        onDateChange?.(newDate);
                        setIsDatePickerOpen(false);
                      }}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      style={{ color: 'var(--text-primary)' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-md transition-colors"
              >
                <div className="w-7 h-7 bg-gray-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="hidden md:block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{userName}</span>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{userName}</p>
                    <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Privacy-first tracking</p>
                  </div>
                  <Link href="/settings/integrations" className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-50 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                    <Settings className="h-4 w-4 mr-3" />
                    Settings
                  </Link>
                  <Link href="/export" className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-50 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                    <LogOut className="h-4 w-4 mr-3" />
                    Export Data
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}