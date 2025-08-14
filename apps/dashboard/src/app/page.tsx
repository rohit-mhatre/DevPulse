'use client';

import { useState, useEffect } from 'react';
import { format, startOfDay, endOfDay, subDays, isToday } from 'date-fns';
import { Clock, Activity, TrendingUp, Calendar, BarChart3, Settings, Zap } from 'lucide-react';

import { DashboardHeader } from '@/components/dashboard/header';
import { ActivityChart } from '@/components/dashboard/activity-chart';
import { ProjectBreakdown } from '@/components/dashboard/project-breakdown';
import { TodayOverview } from '@/components/dashboard/today-overview';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { TodaysSummary } from '@/components/dashboard/todays-summary';
import { FocusWidget } from '@/components/focus/focus-widget';

interface ActivityData {
  timestamp: number;
  activity_type: string;
  app_name: string;
  duration_seconds: number;
  project_name?: string;
}

interface DashboardStats {
  totalTime: number;
  activities: number;
  activeProjects: number;
  avgSessionTime: number;
  topApp: string;
  productivityScore: number;
}

export default function DashboardPage() {
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real data from the desktop app's database
  useEffect(() => {
    const fetchRealData = async () => {
      try {
        const response = await fetch('/api/activity');
        const data = await response.json();
        
        if (data.error) {
          console.error('Error fetching activity data:', data.error);
          // Fall back to empty state
          setActivityData([]);
          setStats({
            totalTime: 0,
            activities: 0,
            activeProjects: 0,
            avgSessionTime: 0,
            topApp: '',
            productivityScore: 0
          });
        } else {
          setActivityData(data.activities || []);
          setStats(data.stats || {
            totalTime: 0,
            activities: 0,
            activeProjects: 0,
            avgSessionTime: 0,
            topApp: '',
            productivityScore: 0
          });
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to fetch activity data:', error);
        // Fall back to empty state
        setActivityData([]);
        setStats({
          totalTime: 0,
          activities: 0,
          activeProjects: 0,
          avgSessionTime: 0,
          topApp: '',
          productivityScore: 0
        });
        setIsLoading(false);
      }
    };

    fetchRealData();
    
    // Set up auto-refresh every 30 seconds to get latest data
    const interval = setInterval(fetchRealData, 30000);
    
    return () => clearInterval(interval);
  }, [selectedDate]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your productivity insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard
            icon={<Clock className="w-6 h-6" />}
            title="Total Time"
            value={formatDuration(stats?.totalTime || 0)}
            subtitle="Today"
            color="bg-blue-500"
          />
          <StatsCard
            icon={<Activity className="w-6 h-6" />}
            title="Activities"
            value={stats?.activities.toString() || '0'}
            subtitle="Recorded today"
            color="bg-green-500"
          />
          <StatsCard
            icon={<BarChart3 className="w-6 h-6" />}
            title="Projects"
            value={stats?.activeProjects.toString() || '0'}
            subtitle="Active today"
            color="bg-purple-500"
          />
          <StatsCard
            icon={<TrendingUp className="w-6 h-6" />}
            title="Productivity"
            value={`${stats?.productivityScore || 0}%`}
            subtitle="Daily score"
            color="bg-orange-500"
          />
        </div>

        {/* Today's Summary - Full Width */}
        <div className="mb-8">
          <TodaysSummary data={activityData} />
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-8">
            <TodayOverview data={activityData} />
            <ActivityChart data={activityData} />
          </div>
          
          {/* Right Column - Sidebar */}
          <div className="space-y-8">
            <FocusWidget />
            <ProjectBreakdown data={activityData} />
            <RecentActivity data={activityData.slice(0, 10)} />
          </div>
        </div>
      </main>
    </div>
  );
}

interface StatsCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle: string;
  color: string;
}

function StatsCard({ icon, title, value, subtitle, color }: StatsCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className={`${color} p-3 rounded-lg text-white`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `${seconds}s`;
  }
}
