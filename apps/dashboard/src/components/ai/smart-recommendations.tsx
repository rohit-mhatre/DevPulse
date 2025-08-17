'use client';

import React, { useState, useEffect } from 'react';
import { 
  Lightbulb, 
  Clock, 
  Target, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle,
  Calendar,
  Coffee,
  Brain,
  Zap,
  Settings,
  ArrowRight
} from 'lucide-react';
import { aiAnalyzer, DeepWorkMetrics } from '@/lib/ai-analytics';
import { mlPatternRecognizer, EnergyPrediction } from '@/lib/ml-patterns';

interface ActivityData {
  timestamp: number;
  activity_type: string;
  app_name: string;
  duration_seconds: number;
  project_name?: string;
  started_at: string;
}

interface Recommendation {
  id: string;
  type: 'schedule' | 'workflow' | 'environment' | 'health' | 'focus';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action: string;
  impact: string;
  timeframe: string;
  confidence: number;
  icon: React.ReactNode;
}

interface SmartRecommendationsProps {
  data: ActivityData[];
  deepWorkMetrics?: DeepWorkMetrics;
}

export function SmartRecommendations({ data, deepWorkMetrics }: SmartRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [energyPrediction, setEnergyPrediction] = useState<EnergyPrediction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    generateRecommendations();
  }, [data, deepWorkMetrics]);

  const generateRecommendations = async () => {
    setIsLoading(true);
    
    try {
      // Convert data to ActivityRecord format
      const activities = data.map(d => ({
        id: d.timestamp,
        started_at: d.started_at || new Date(d.timestamp).toISOString(),
        activity_type: d.activity_type,
        app_name: d.app_name,
        duration_seconds: d.duration_seconds,
        project_name: d.project_name
      }));

      // Get energy prediction
      const energy = mlPatternRecognizer.predictEnergyLevels(activities, new Date().getHours());
      setEnergyPrediction(energy);

      // Generate recommendations based on analysis
      const recs = await generateSmartRecommendations(activities, deepWorkMetrics, energy);
      setRecommendations(recs);
    } catch (error) {
      console.error('Error generating recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateSmartRecommendations = async (
    activities: any[],
    metrics?: DeepWorkMetrics,
    energy?: EnergyPrediction
  ): Promise<Recommendation[]> => {
    const recs: Recommendation[] = [];

    if (!metrics || activities.length === 0) {
      return [{
        id: 'start-tracking',
        type: 'workflow',
        priority: 'high',
        title: 'Start Activity Tracking',
        description: 'Begin tracking your work activities to receive personalized AI recommendations.',
        action: 'Enable DevPulse activity tracking and work for a few days',
        impact: 'Foundation for all AI insights',
        timeframe: 'Immediate',
        confidence: 1.0,
        icon: <Target className="w-5 h-5 text-indigo-500" />
      }];
    }

    // Schedule optimization recommendations
    if (energy && energy.optimalTaskTiming) {
      const currentHour = new Date().getHours();
      const deepWorkHours = energy.optimalTaskTiming['deep-work'] || [];
      
      if (deepWorkHours.length > 0 && !deepWorkHours.includes(currentHour)) {
        const nextOptimalHour = deepWorkHours.find(h => h > currentHour) || deepWorkHours[0];
        
        recs.push({
          id: 'schedule-deep-work',
          type: 'schedule',
          priority: 'high',
          title: 'Optimize Deep Work Timing',
          description: `Your peak performance hours are ${deepWorkHours.map(h => `${h}:00`).join(', ')}. Schedule demanding tasks during these windows.`,
          action: `Plan your next coding session for ${nextOptimalHour}:00`,
          impact: 'Up to 40% increase in productivity',
          timeframe: 'Today',
          confidence: 0.85,
          icon: <Clock className="w-5 h-5 text-blue-500" />
        });
      }
    }

    // Focus improvement recommendations
    if (metrics.breakdown.focusEffectiveness < 60) {
      recs.push({
        id: 'improve-focus',
        type: 'focus',
        priority: 'high',
        title: 'Enhance Focus Sessions',
        description: 'Your focus sessions are frequently interrupted. Implementing structured focus techniques can dramatically improve deep work quality.',
        action: 'Try 45-minute focus blocks with 15-minute breaks',
        impact: 'Reduce context switching by 60%',
        timeframe: 'This week',
        confidence: 0.9,
        icon: <Brain className="w-5 h-5 text-purple-500" />
      });
    }

    // Context switching recommendations
    if (metrics.breakdown.contextSwitching < 50) {
      recs.push({
        id: 'reduce-context-switching',
        type: 'workflow',
        priority: 'high',
        title: 'Minimize Context Switching',
        description: 'Excessive app and task switching is reducing your cognitive efficiency. Time blocking can help.',
        action: 'Group similar tasks together and use focus mode',
        impact: 'Increase effective work time by 25%',
        timeframe: 'This week',
        confidence: 0.88,
        icon: <Target className="w-5 h-5 text-red-500" />
      });
    }

    // Energy management recommendations
    if (energy && energy.recoveryNeeded) {
      recs.push({
        id: 'energy-recovery',
        type: 'health',
        priority: 'medium',
        title: 'Energy Recovery Needed',
        description: 'Your cognitive energy is depleted. Taking strategic breaks will improve overall performance.',
        action: 'Take a 15-20 minute break away from screens',
        impact: 'Restore 70% of cognitive capacity',
        timeframe: 'Now',
        confidence: 0.92,
        icon: <Coffee className="w-5 h-5 text-amber-500" />
      });
    }

    // Time optimization recommendations
    if (metrics.breakdown.timeOptimization < 70) {
      const currentHour = new Date().getHours();
      const isLowProductivityHour = currentHour >= 13 && currentHour <= 15; // Post-lunch dip
      
      if (isLowProductivityHour) {
        recs.push({
          id: 'time-optimization',
          type: 'schedule',
          priority: 'medium',
          title: 'Optimize Low-Energy Hours',
          description: 'You\'re working during a natural energy dip. Consider lighter tasks or scheduling breaks.',
          action: 'Handle emails, admin tasks, or take a power nap',
          impact: 'Better energy allocation',
          timeframe: 'Now',
          confidence: 0.75,
          icon: <TrendingUp className="w-5 h-5 text-green-500" />
        });
      }
    }

    // Consistency recommendations
    if (metrics.breakdown.consistencyBonus < 40) {
      recs.push({
        id: 'improve-consistency',
        type: 'workflow',
        priority: 'medium',
        title: 'Build Consistent Routines',
        description: 'Your productivity varies significantly day-to-day. Establishing routines can improve consistency.',
        action: 'Set fixed start times and work rituals',
        impact: 'Reduce productivity variance by 50%',
        timeframe: 'Next 2 weeks',
        confidence: 0.78,
        icon: <Calendar className="w-5 h-5 text-indigo-500" />
      });
    }

    // Environment optimization
    const distractingApps = getDistractingApps(activities);
    if (distractingApps.length > 0) {
      recs.push({
        id: 'environment-optimization',
        type: 'environment',
        priority: 'medium',
        title: 'Optimize Work Environment',
        description: `High usage of distracting apps: ${distractingApps.join(', ')}. Consider using focus tools.`,
        action: 'Use website blockers during focus sessions',
        impact: 'Eliminate 80% of digital distractions',
        timeframe: 'Today',
        confidence: 0.82,
        icon: <Settings className="w-5 h-5 text-gray-500" />
      });
    }

    // Burnout prevention
    if (metrics.predictions.burnoutRisk > 70) {
      recs.push({
        id: 'burnout-prevention',
        type: 'health',
        priority: 'high',
        title: 'Burnout Risk Detected',
        description: 'Your current work intensity is unsustainable. Immediate action is needed to prevent burnout.',
        action: 'Reduce work hours by 20% this week',
        impact: 'Prevent productivity crash',
        timeframe: 'This week',
        confidence: 0.93,
        icon: <AlertTriangle className="w-5 h-5 text-red-600" />
      });
    }

    // Sort by priority and confidence
    return recs.sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityWeight[b.priority] - priorityWeight[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.confidence - a.confidence;
    });
  };

  const getDistractingApps = (activities: any[]): string[] => {
    const distractingTypes = ['browse', 'social', 'entertainment'];
    const appUsage: { [app: string]: number } = {};
    
    activities
      .filter(a => distractingTypes.includes(a.activity_type))
      .forEach(a => {
        appUsage[a.app_name] = (appUsage[a.app_name] || 0) + a.duration_seconds;
      });

    return Object.entries(appUsage)
      .filter(([, time]) => time > 1800) // More than 30 minutes
      .map(([app]) => app)
      .slice(0, 3);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-amber-200 bg-amber-50';
      default:
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getPriorityTextColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-700';
      case 'medium':
        return 'text-amber-700';
      default:
        return 'text-blue-700';
    }
  };

  const categories = [
    { id: 'all', label: 'All Recommendations', count: recommendations.length },
    { id: 'schedule', label: 'Schedule', count: recommendations.filter(r => r.type === 'schedule').length },
    { id: 'focus', label: 'Focus', count: recommendations.filter(r => r.type === 'focus').length },
    { id: 'workflow', label: 'Workflow', count: recommendations.filter(r => r.type === 'workflow').length },
    { id: 'health', label: 'Wellbeing', count: recommendations.filter(r => r.type === 'health').length }
  ];

  const filteredRecommendations = selectedCategory === 'all' 
    ? recommendations 
    : recommendations.filter(r => r.type === selectedCategory);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Lightbulb className="w-6 h-6 text-amber-500" />
          <h3 className="text-lg font-semibold text-gray-900">Smart Recommendations</h3>
        </div>
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Lightbulb className="w-6 h-6 text-amber-500" />
        <h3 className="text-lg font-semibold text-gray-900">Smart Recommendations</h3>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === category.id
                ? 'bg-amber-100 text-amber-700 border border-amber-300'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {category.label} ({category.count})
          </button>
        ))}
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {filteredRecommendations.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">All Good!</h4>
            <p className="text-gray-600">No immediate recommendations. Keep up the excellent work!</p>
          </div>
        ) : (
          filteredRecommendations.map((rec) => (
            <div
              key={rec.id}
              className={`border rounded-lg p-4 transition-all duration-200 hover:shadow-md ${getPriorityColor(rec.priority)}`}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">
                  {rec.icon}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{rec.title}</h4>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getPriorityTextColor(rec.priority)} bg-white`}>
                        {rec.priority}
                      </span>
                      <span className="text-xs text-gray-500">
                        {Math.round(rec.confidence * 100)}% confidence
                      </span>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-3">{rec.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="flex items-center space-x-1 mb-1">
                        <ArrowRight className="w-4 h-4 text-blue-500" />
                        <span className="font-medium text-gray-700">Action</span>
                      </div>
                      <p className="text-gray-600">{rec.action}</p>
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-1 mb-1">
                        <TrendingUp className="w-4 h-4 text-green-500" />
                        <span className="font-medium text-gray-700">Impact</span>
                      </div>
                      <p className="text-gray-600">{rec.impact}</p>
                    </div>
                    
                    <div>
                      <div className="flex items-center space-x-1 mb-1">
                        <Clock className="w-4 h-4 text-purple-500" />
                        <span className="font-medium text-gray-700">Timeframe</span>
                      </div>
                      <p className="text-gray-600">{rec.timeframe}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Quick Actions */}
      {filteredRecommendations.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Quick Actions</h4>
          <div className="flex flex-wrap gap-2">
            <button className="px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-200 transition-colors">
              Start Focus Session
            </button>
            <button className="px-4 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors">
              Schedule Break
            </button>
            <button className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200 transition-colors">
              Review Schedule
            </button>
          </div>
        </div>
      )}
    </div>
  );
}