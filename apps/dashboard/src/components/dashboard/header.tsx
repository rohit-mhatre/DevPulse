'use client';

import { useState } from 'react';
import { Bell, Settings, Search, Calendar, User, LogOut, Target, Github, BarChart3, Brain } from 'lucide-react';
import Link from 'next/link';
import { ExportWidget } from '@/components/export/export-widget';

export function DashboardHeader() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-8">
            <div className="flex-shrink-0">
              <Link href="/" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">DP</span>
                </div>
                <span className="text-xl font-bold text-gray-900">DevPulse</span>
              </Link>
            </div>
            
            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link 
                href="/"
                className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
              >
                <BarChart3 className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              <Link 
                href="/github"
                className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
              >
                <Github className="h-4 w-4" />
                <span>GitHub</span>
              </Link>
              <Link 
                href="/focus"
                className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
              >
                <Target className="h-4 w-4" />
                <span>Focus</span>
              </Link>
              <Link 
                href="/ai-analytics"
                className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors"
              >
                <Brain className="h-4 w-4" />
                <span>AI Analytics</span>
              </Link>
            </nav>
          </div>

          {/* Search Bar */}
          <div className="hidden md:block flex-1 max-w-xs mx-8">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Search activities, projects..."
              />
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-4">
            {/* Export Widget */}
            <ExportWidget className="hidden md:block" />
            

            {/* Notifications */}
            <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="h-5 w-5" />
            </button>

            {/* Settings */}
            <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="h-5 w-5" />
            </button>

            {/* Date Picker */}
            <button className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:block">Today</span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center space-x-2 p-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="hidden md:block text-sm font-medium">Local User</span>
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-10 border border-gray-200">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">Local User</p>
                    <p className="text-xs text-gray-500">Privacy-first tracking</p>
                  </div>
                  <Link href="/settings/integrations" className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    <Settings className="h-4 w-4 mr-3" />
                    Settings
                  </Link>
                  <Link href="/export" className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
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