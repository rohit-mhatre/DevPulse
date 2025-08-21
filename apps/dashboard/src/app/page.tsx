'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
// import { format, startOfDay, endOfDay, subDays, isToday } from 'date-fns';
// import { Clock, Activity, TrendingUp, Calendar, BarChart3, Settings, Zap } from 'lucide-react';

import { DashboardHeader } from '@/components/dashboard/header';
import { TodayOverview } from '@/components/dashboard/today-overview';
import { TodaysSummary } from '@/components/dashboard/todays-summary';
import { EnhancedMetrics } from '@/components/dashboard/enhanced-metrics';

// Lazy load heavy components
const ActivityChart = lazy(() => import('@/components/dashboard/activity-chart').then(module => ({ default: module.ActivityChart })));
const ProjectBreakdown = lazy(() => import('@/components/dashboard/project-breakdown').then(module => ({ default: module.ProjectBreakdown })));
const RecentActivity = lazy(() => import('@/components/dashboard/recent-activity').then(module => ({ default: module.RecentActivity })));
const ProductivityHeatmap = lazy(() => import('@/components/dashboard/productivity-heatmap').then(module => ({ default: module.ProductivityHeatmap })));
const FocusWidget = lazy(() => import('@/components/focus/focus-widget').then(module => ({ default: module.FocusWidget })));

// Loading component
const ComponentLoader = () => (
  <div className="card p-6 animate-pulse">
    <div className="space-y-4">
      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      <div className="h-24 bg-gray-200 rounded"></div>
    </div>
  </div>
);

interface ActivityData {
  timestamp: number;
  activity_type: string;
  app_name: string;
  duration_seconds: number;
  project_name?: string;
  started_at: string;
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
        // Format date for API call
        const dateStr = selectedDate.toISOString().split('T')[0];
        const response = await fetch(`/api/activity?date=${dateStr}`);
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
          const activities = (data.activities || []).map((activity: any) => ({
            ...activity,
            started_at: activity.started_at || new Date(activity.timestamp).toISOString()
          }));
          setActivityData(activities);
          setStats(data.stats || {
            totalTime: 0,
            activities: 0,
            activeProjects: 0,
            avgSessionTime: 0,
            topApp: '',
            productivityScore: 0
          });
          
          // AI insights removed to prevent database conflicts
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

  // AI insights function removed to prevent database conflicts

  // Time range function removed with AI components

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600 mx-auto mb-3"></div>
          <p className="text-sm text-tertiary">Loading your productivity insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <DashboardHeader 
        selectedDate={selectedDate}
        onDateChange={setSelectedDate}
        activityData={activityData}
        stats={stats}
      />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Enhanced Metrics Dashboard */}
        <div className="mb-6">
          <EnhancedMetrics data={activityData} focusGoal={240} />
        </div>

        {/* Today's Summary - Full Width */}
        <div className="mb-6">
          <TodaysSummary data={activityData} stats={stats} />
        </div>

        {/* Productivity Heatmap - Full Width */}
        <div className="mb-6">
          <Suspense fallback={<ComponentLoader />}>
            <ProductivityHeatmap data={activityData} />
          </Suspense>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            <TodayOverview data={activityData} />
            <Suspense fallback={<ComponentLoader />}>
              <ActivityChart data={activityData} />
            </Suspense>
          </div>
          
          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            <Suspense fallback={<ComponentLoader />}>
              <FocusWidget 
                todayFocusTime={activityData.filter(a => ['code', 'build', 'test', 'debug'].includes(a.activity_type))
                  .reduce((sum, a) => sum + (a.duration_seconds), 0)} // Calculate actual focus time
                isSessionActive={false} // Will be fetched from localStorage
                focusScore={stats?.productivityScore || 75}
                dailyGoal={240 * 60} // 4 hours default
              />
            </Suspense>
            {/* GitHub widget temporarily disabled - <GitHubActivityWidgetComponent /> */}
            <Suspense fallback={<ComponentLoader />}>
              <ProjectBreakdown data={activityData} />
            </Suspense>
            <Suspense fallback={<ComponentLoader />}>
              <RecentActivity data={activityData.slice(0, 10)} />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}


// function formatDuration(seconds: number): string {
//   const hours = Math.floor(seconds / 3600);
//   const minutes = Math.floor((seconds % 3600) / 60);
//   
//   if (hours > 0) {
//     return `${hours}h ${minutes}m`;
//   } else if (minutes > 0) {
//     return `${minutes}m`;
//   } else {
//     return `${seconds}s`;
//   }
// }
