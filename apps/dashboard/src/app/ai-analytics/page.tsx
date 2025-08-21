'use client';

import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  Clock, 
  Zap,
  BarChart3,
  Settings,
  Download,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { DashboardHeader } from '@/components/dashboard/header';
import { AIInsightsPanel } from '@/components/ai/ai-insights-panel';
import { SmartRecommendations } from '@/components/ai/smart-recommendations';
import { ProductivityCoach } from '@/components/ai/productivity-coach';
import { AnomalyDetector } from '@/components/ai/anomaly-detector';

interface ActivityData {
  timestamp: number;
  activity_type: string;
  app_name: string;
  duration_seconds: number;
  project_name?: string;
  started_at: string;
}

interface AIAnalyticsData {
  insights: any;
  patterns: any;
  timeRange: { startDate: string; endDate: string };
  dataPoints: number;
}

export default function AIAnalyticsPage() {
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [aiData, setAiData] = useState<AIAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '14d' | '30d'>('7d');

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const loadData = async () => {
    setIsLoading(true);
    
    try {
      // Load activity data
      const activityResponse = await fetch('/api/activity');
      const activityResult = await activityResponse.json();
      
      if (!activityResult.error) {
        const activities = (activityResult.activities || []).map((activity: any) => ({
          ...activity,
          started_at: activity.started_at || new Date(activity.timestamp).toISOString()
        }));
        setActivityData(activities);
      }

      // Load AI analytics
      const aiResponse = await fetch(
        `/api/ai/insights?startDate=${timeRange.startDate}&endDate=${timeRange.endDate}&type=comprehensive`
      );
      const aiResult = await aiResponse.json();
      
      if (!aiResult.error) {
        setAiData(aiResult);
      }
    } catch (error) {
      console.error('Failed to load AI analytics data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeriodChange = (period: '7d' | '14d' | '30d') => {
    setSelectedPeriod(period);
    const endDate = new Date();
    const startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '14d':
        startDate.setDate(endDate.getDate() - 14);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
    }
    
    setTimeRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
  };

  const exportInsights = async () => {
    if (!aiData) return;
    
    try {
      const exportData = {
        generatedAt: new Date().toISOString(),
        timeRange: aiData.timeRange,
        insights: aiData.insights,
        patterns: aiData.patterns,
        dataPoints: aiData.dataPoints
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-insights-${aiData.timeRange.startDate}-to-${aiData.timeRange.endDate}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export insights:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <DashboardHeader />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Analyzing your productivity patterns with AI...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <Brain className="w-8 h-8 text-blue-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">AI Productivity Analytics</h1>
                  <p className="text-gray-600">
                    Advanced insights powered by machine learning and pattern recognition
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {/* Time Period Selector */}
              <div className="flex bg-white border border-gray-200 rounded-lg p-1">
                {[
                  { id: '7d', label: '7 Days' },
                  { id: '14d', label: '14 Days' },
                  { id: '30d', label: '30 Days' }
                ].map((period) => (
                  <button
                    key={period.id}
                    onClick={() => handlePeriodChange(period.id as any)}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      selectedPeriod === period.id
                        ? 'bg-blue-100 text-blue-700'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {period.label}
                  </button>
                ))}
              </div>
              
              {/* Action Buttons */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              
              <button
                onClick={exportInsights}
                disabled={!aiData}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
          
          {/* Analytics Summary */}
          {aiData && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center space-x-3">
                  <Target className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Deep Work Score</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {aiData.insights?.score || 0}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center space-x-3">
                  <Zap className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Flow Sessions</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {aiData.patterns?.flowStates?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center space-x-3">
                  <BarChart3 className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Data Points</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {aiData.dataPoints || 0}
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-8 h-8 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">Confidence</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {aiData.insights?.confidence ? Math.round(aiData.insights.confidence * 100) : 0}%
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Full Width on mobile, 2/3 on desktop */}
          <div className="xl:col-span-2 space-y-8">
            {/* AI Insights Panel */}
            <AIInsightsPanel 
              data={activityData} 
              timeRange={timeRange}
            />
            
            {/* Smart Recommendations */}
            <SmartRecommendations 
              data={activityData}
              deepWorkMetrics={aiData?.insights}
            />
            
            {/* Anomaly Detection */}
            <AnomalyDetector 
              data={activityData}
              timeRange={timeRange}
            />
          </div>
          
          {/* Right Column - Sidebar */}
          <div className="space-y-8">
            {/* Productivity Coach */}
            <ProductivityCoach 
              data={activityData}
              deepWorkMetrics={aiData?.insights}
            />
            
            {/* Quick Stats */}
            {aiData?.insights && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
                <div className="space-y-4">
                  {Object.entries(aiData.insights.breakdown).map(([key, value]) => {
                    const formatKey = (k: string) => {
                      return k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                    };
                    
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{formatKey(key)}</span>
                          <span className="font-medium">{Math.round(value as number)}/100</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                              (value as number) >= 80 ? 'bg-green-500' : 
                              (value as number) >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${value}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* AI Predictions */}
            {aiData?.insights?.predictions && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Predictions</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Optimal Work Hours</p>
                    <div className="flex flex-wrap gap-1">
                      {aiData.insights.predictions.optimalWorkHours.map((hour: number) => (
                        <span 
                          key={hour}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                        >
                          {hour.toString().padStart(2, '0')}:00
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Weekly Capacity</p>
                      <p className="text-lg font-bold text-gray-900">
                        {aiData.insights.predictions.weeklyCapacity}h
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Burnout Risk</p>
                      <p className={`text-lg font-bold ${
                        aiData.insights.predictions.burnoutRisk > 70 ? 'text-red-600' :
                        aiData.insights.predictions.burnoutRisk > 40 ? 'text-amber-600' : 'text-green-600'
                      }`}>
                        {aiData.insights.predictions.burnoutRisk}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>All AI processing happens locally on your device. Your data never leaves your machine.</p>
        </div>
      </main>
    </div>
  );
}