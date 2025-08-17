'use client';

import { useState, useEffect } from 'react';
// import { format, startOfDay, endOfDay, subDays, isToday } from 'date-fns';
// import { Clock, Activity, TrendingUp, Calendar, BarChart3, Settings, Zap } from 'lucide-react';

import { DashboardHeader } from '@/components/dashboard/header';
import { ActivityChart } from '@/components/dashboard/activity-chart';
import { ProjectBreakdown } from '@/components/dashboard/project-breakdown';
import { TodayOverview } from '@/components/dashboard/today-overview';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { TodaysSummary } from '@/components/dashboard/todays-summary';
import { ProductivityHeatmap } from '@/components/dashboard/productivity-heatmap';
import { EnhancedMetrics } from '@/components/dashboard/enhanced-metrics';
import { FocusWidget } from '@/components/focus/focus-widget';
// GitHub component temporarily disabled - import { GitHubActivityWidgetComponent } from '@/components/github';
import { AIInsightsPanel } from '@/components/ai/ai-insights-panel';
import { SmartRecommendations } from '@/components/ai/smart-recommendations';
import { ProductivityCoach } from '@/components/ai/productivity-coach';

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
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  // const [selectedDate, setSelectedDate] = useState(new Date());
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
          
          // Load AI insights if we have data
          if (activities.length > 0) {
            loadAIInsights();
          }
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
  }, []);

  const loadAIInsights = async () => {
    setIsLoadingAI(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7); // Last 7 days
      
      const response = await fetch(`/api/ai/insights?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}&type=comprehensive`);
      const insights = await response.json();
      
      if (!insights.error) {
        setAiInsights(insights);
      }
    } catch (error) {
      console.error('Failed to load AI insights:', error);
    } finally {
      setIsLoadingAI(false);
    }
  };

  const getTimeRange = () => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 7);
    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  };

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
        {/* Enhanced Metrics Dashboard */}
        <div className="mb-8">
          <EnhancedMetrics data={activityData} focusGoal={240} />
        </div>

        {/* Today's Summary - Full Width */}
        <div className="mb-8">
          <TodaysSummary data={activityData} />
        </div>

        {/* AI Insights Panel - Full Width */}
        <div className="mb-8">
          <AIInsightsPanel data={activityData} timeRange={getTimeRange()} />
        </div>

        {/* Productivity Heatmap - Full Width */}
        <div className="mb-8">
          <ProductivityHeatmap data={activityData} />
        </div>

        {/* AI Recommendations - Full Width */}
        <div className="mb-8">
          <SmartRecommendations 
            data={activityData} 
            deepWorkMetrics={aiInsights?.insights}
          />
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-8">
            <TodayOverview data={activityData} />
            <ActivityChart data={activityData} />
            
            {/* AI Productivity Coach */}
            <ProductivityCoach 
              data={activityData}
              deepWorkMetrics={aiInsights?.insights}
            />
          </div>
          
          {/* Right Column - Sidebar */}
          <div className="space-y-8">
            <FocusWidget 
              todayFocusTime={activityData.filter(a => ['code', 'build', 'test', 'debug'].includes(a.activity_type))
                .reduce((sum, a) => sum + (a.duration_seconds), 0)} // Calculate actual focus time
              isSessionActive={false} // Will be fetched from localStorage
              focusScore={aiInsights?.insights?.score || stats?.productivityScore || 75}
              dailyGoal={240 * 60} // 4 hours default
            />
            {/* GitHub widget temporarily disabled - <GitHubActivityWidgetComponent /> */}
            <ProjectBreakdown data={activityData} />
            <RecentActivity data={activityData.slice(0, 10)} />
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
