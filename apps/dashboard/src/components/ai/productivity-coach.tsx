'use client';

import React, { useState, useEffect } from 'react';
import { 
  MessageCircle, 
  TrendingUp, 
  Target, 
  Calendar, 
  Clock, 
  Brain,
  Zap,
  AlertCircle,
  CheckCircle,
  ArrowUp,
  ArrowDown,
  Minus,
  Coffee,
  Focus,
  BarChart3
} from 'lucide-react';
import { aiAnalyzer, DeepWorkMetrics } from '@/lib/ai-analytics';
import { mlPatternRecognizer } from '@/lib/ml-patterns';

interface ActivityData {
  timestamp: number;
  activity_type: string;
  app_name: string;
  duration_seconds: number;
  project_name?: string;
  started_at: string;
}

interface CoachingMessage {
  id: string;
  type: 'insight' | 'encouragement' | 'correction' | 'goal' | 'warning';
  title: string;
  message: string;
  timestamp: Date;
  actionable: boolean;
  actions?: string[];
  metric?: {
    label: string;
    value: number;
    change: number;
    trend: 'up' | 'down' | 'stable';
  };
}

interface ProductivityGoal {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  deadline: Date;
  priority: 'high' | 'medium' | 'low';
  status: 'on-track' | 'behind' | 'ahead' | 'at-risk';
}

interface ProductivityCoachProps {
  data: ActivityData[];
  deepWorkMetrics?: DeepWorkMetrics;
}

export function ProductivityCoach({ data, deepWorkMetrics }: ProductivityCoachProps) {
  const [messages, setMessages] = useState<CoachingMessage[]>([]);
  const [goals, setGoals] = useState<ProductivityGoal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'messages' | 'goals' | 'progress'>('messages');

  useEffect(() => {
    generateCoachingContent();
  }, [data, deepWorkMetrics]);

  const generateCoachingContent = async () => {
    setIsLoading(true);
    
    try {
      // Convert data for analysis
      const activities = data.map(d => ({
        id: d.timestamp,
        started_at: d.started_at || new Date(d.timestamp).toISOString(),
        activity_type: d.activity_type,
        app_name: d.app_name,
        duration_seconds: d.duration_seconds,
        project_name: d.project_name
      }));

      // Generate coaching messages
      const coachingMessages = await generateCoachingMessages(activities, deepWorkMetrics);
      setMessages(coachingMessages);

      // Generate personalized goals
      const personalizedGoals = generatePersonalizedGoals(activities, deepWorkMetrics);
      setGoals(personalizedGoals);
    } catch (error) {
      console.error('Error generating coaching content:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateCoachingMessages = async (
    activities: any[],
    metrics?: DeepWorkMetrics
  ): Promise<CoachingMessage[]> => {
    const messages: CoachingMessage[] = [];
    const now = new Date();

    if (!metrics || activities.length === 0) {
      return [{
        id: 'welcome',
        type: 'insight',
        title: 'Welcome to AI Coaching',
        message: 'Start tracking your activities to receive personalized coaching insights that will help optimize your productivity.',
        timestamp: now,
        actionable: true,
        actions: ['Begin activity tracking', 'Set up your first focus session']
      }];
    }

    // Performance trend analysis
    const scoreChange = getScoreChange(activities, metrics.score);
    if (scoreChange !== null) {
      if (scoreChange > 10) {
        messages.push({
          id: 'performance-improvement',
          type: 'encouragement',
          title: 'Excellent Progress!',
          message: `Your deep work score has improved by ${scoreChange} points. You're building excellent productivity habits. Keep up this momentum!`,
          timestamp: now,
          actionable: false,
          metric: {
            label: 'Deep Work Score',
            value: metrics.score,
            change: scoreChange,
            trend: 'up'
          }
        });
      } else if (scoreChange < -10) {
        messages.push({
          id: 'performance-decline',
          type: 'correction',
          title: 'Let\'s Get Back on Track',
          message: `Your productivity has dipped by ${Math.abs(scoreChange)} points. This is normal - let's identify what changed and adjust your approach.`,
          timestamp: now,
          actionable: true,
          actions: ['Review recent schedule changes', 'Check for new distractions', 'Assess workload balance'],
          metric: {
            label: 'Deep Work Score',
            value: metrics.score,
            change: scoreChange,
            trend: 'down'
          }
        });
      }
    }

    // Focus effectiveness coaching
    if (metrics.breakdown.focusEffectiveness < 50) {
      messages.push({
        id: 'focus-coaching',
        type: 'correction',
        title: 'Focus Challenge Detected',
        message: 'Your focus sessions are being interrupted frequently. Let\'s implement some proven techniques to protect your deep work time.',
        timestamp: now,
        actionable: true,
        actions: [
          'Use the 2-minute rule: if a task takes less than 2 minutes, do it now',
          'Set specific "communication windows" for emails and messages',
          'Try the 90-minute work blocks based on your natural energy cycles'
        ]
      });
    } else if (metrics.breakdown.focusEffectiveness > 80) {
      messages.push({
        id: 'focus-mastery',
        type: 'encouragement',
        title: 'Focus Mastery Achievement',
        message: 'Outstanding! You\'re maintaining excellent focus during work sessions. This level of concentration is what separates high performers.',
        timestamp: now,
        actionable: true,
        actions: ['Consider increasing session lengths gradually', 'Share your focus techniques with your team']
      });
    }

    // Energy management coaching
    const currentHour = now.getHours();
    const energyPrediction = mlPatternRecognizer.predictEnergyLevels(activities, currentHour);
    
    if (energyPrediction.recoveryNeeded) {
      messages.push({
        id: 'energy-management',
        type: 'warning',
        title: 'Energy Recovery Recommended',
        message: 'Your cognitive energy is running low. Taking a strategic break now will prevent a productivity crash later.',
        timestamp: now,
        actionable: true,
        actions: [
          'Take a 15-minute walk outside',
          'Practice 5 minutes of deep breathing',
          'Do some light stretching'
        ]
      });
    }

    // Context switching coaching
    if (metrics.breakdown.contextSwitching < 40) {
      messages.push({
        id: 'context-switching',
        type: 'correction',
        title: 'Too Much Task Jumping',
        message: 'Excessive context switching is costing you significant cognitive energy. Let\'s optimize your task management.',
        timestamp: now,
        actionable: true,
        actions: [
          'Batch similar tasks together',
          'Use time-blocking for different activity types',
          'Set specific times for checking messages'
        ]
      });
    }

    // Burnout prevention
    if (metrics.predictions.burnoutRisk > 70) {
      messages.push({
        id: 'burnout-prevention',
        type: 'warning',
        title: 'Burnout Risk Alert',
        message: 'Your current work intensity is unsustainable. Let\'s adjust your approach before it impacts your health and performance.',
        timestamp: now,
        actionable: true,
        actions: [
          'Reduce work hours by 10-20% this week',
          'Delegate or postpone non-critical tasks',
          'Schedule mandatory recovery time'
        ]
      });
    }

    // Time optimization coaching
    if (metrics.breakdown.timeOptimization < 60) {
      const optimalHours = metrics.predictions.optimalWorkHours;
      messages.push({
        id: 'time-optimization',
        type: 'insight',
        title: 'Optimize Your Schedule',
        message: `Your most productive hours are ${optimalHours.map(h => `${h}:00`).join(', ')}. Aligning your most challenging work with these times could boost your productivity significantly.`,
        timestamp: now,
        actionable: true,
        actions: [
          'Schedule coding tasks during peak hours',
          'Move meetings to lower-energy periods',
          'Use calendar blocking for deep work'
        ]
      });
    }

    // Consistency coaching
    if (metrics.breakdown.consistencyBonus < 50) {
      messages.push({
        id: 'consistency-coaching',
        type: 'insight',
        title: 'Build Stronger Routines',
        message: 'Your productivity varies significantly day-to-day. Establishing consistent routines can smooth out these fluctuations and improve your average performance.',
        timestamp: now,
        actionable: true,
        actions: [
          'Set a consistent daily start time',
          'Create a morning routine that primes you for work',
          'Establish shutdown rituals to end your workday'
        ]
      });
    }

    // Positive reinforcement for good habits
    if (metrics.score > 80) {
      messages.push({
        id: 'high-performance',
        type: 'encouragement',
        title: 'High Performance Mode',
        message: 'You\'re operating at an exceptional level! Your current habits are setting you up for continued success.',
        timestamp: now,
        actionable: true,
        actions: ['Document what\'s working well', 'Consider mentoring others']
      });
    }

    return messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5);
  };

  const generatePersonalizedGoals = (activities: any[], metrics?: DeepWorkMetrics): ProductivityGoal[] => {
    if (!metrics || activities.length === 0) {
      return [{
        id: 'start-tracking',
        title: 'Begin Activity Tracking',
        target: 7,
        current: 0,
        unit: 'days',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        priority: 'high',
        status: 'behind'
      }];
    }

    const goals: ProductivityGoal[] = [];
    const now = new Date();

    // Deep work score improvement goal
    const targetScore = Math.min(100, metrics.score + 15);
    goals.push({
      id: 'improve-deep-work',
      title: 'Improve Deep Work Score',
      target: targetScore,
      current: metrics.score,
      unit: 'points',
      deadline: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      priority: 'high',
      status: metrics.score >= targetScore * 0.8 ? 'on-track' : 'behind'
    });

    // Focus effectiveness goal
    if (metrics.breakdown.focusEffectiveness < 80) {
      goals.push({
        id: 'improve-focus',
        title: 'Enhance Focus Quality',
        target: 80,
        current: Math.round(metrics.breakdown.focusEffectiveness),
        unit: 'points',
        deadline: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        priority: 'high',
        status: metrics.breakdown.focusEffectiveness >= 64 ? 'on-track' : 'behind'
      });
    }

    // Reduce context switching goal
    if (metrics.breakdown.contextSwitching < 70) {
      goals.push({
        id: 'reduce-switching',
        title: 'Minimize Context Switching',
        target: 70,
        current: Math.round(metrics.breakdown.contextSwitching),
        unit: 'points',
        deadline: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        status: metrics.breakdown.contextSwitching >= 56 ? 'on-track' : 'behind'
      });
    }

    // Weekly capacity goal
    const currentCapacity = metrics.predictions.weeklyCapacity;
    const optimalCapacity = Math.min(50, currentCapacity + 5); // Max 50 hours per week
    goals.push({
      id: 'optimize-capacity',
      title: 'Optimize Weekly Capacity',
      target: optimalCapacity,
      current: currentCapacity,
      unit: 'hours',
      deadline: new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000),
      priority: 'medium',
      status: currentCapacity >= optimalCapacity * 0.9 ? 'on-track' : 'behind'
    });

    return goals;
  };

  const getScoreChange = (activities: any[], currentScore: number): number | null => {
    // This would compare with historical data in a real implementation
    // For now, return a mock change
    if (activities.length < 10) return null;
    return Math.floor(Math.random() * 20) - 10; // Random change for demo
  };

  const getMessageIcon = (type: CoachingMessage['type']) => {
    switch (type) {
      case 'encouragement':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'correction':
        return <Target className="w-5 h-5 text-amber-500" />;
      case 'goal':
        return <Target className="w-5 h-5 text-blue-500" />;
      default:
        return <Brain className="w-5 h-5 text-indigo-500" />;
    }
  };

  const getMessageBgColor = (type: CoachingMessage['type']) => {
    switch (type) {
      case 'encouragement':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-red-50 border-red-200';
      case 'correction':
        return 'bg-amber-50 border-amber-200';
      case 'goal':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-indigo-50 border-indigo-200';
    }
  };

  const getGoalStatusColor = (status: ProductivityGoal['status']) => {
    switch (status) {
      case 'on-track':
        return 'text-green-600 bg-green-100';
      case 'ahead':
        return 'text-blue-600 bg-blue-100';
      case 'behind':
        return 'text-amber-600 bg-amber-100';
      case 'at-risk':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ArrowUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <ArrowDown className="w-4 h-4 text-red-500" />;
      default:
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <MessageCircle className="w-6 h-6 text-indigo-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Productivity Coach</h3>
        </div>
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <MessageCircle className="w-6 h-6 text-indigo-600" />
        <h3 className="text-lg font-semibold text-gray-900">AI Productivity Coach</h3>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-gray-100 rounded-lg p-1">
        {[
          { id: 'messages', label: 'Coaching', icon: MessageCircle },
          { id: 'goals', label: 'Goals', icon: Target },
          { id: 'progress', label: 'Progress', icon: BarChart3 }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setSelectedTab(tab.id as any)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedTab === tab.id
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Messages Tab */}
      {selectedTab === 'messages' && (
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">Analyzing your patterns...</p>
            </div>
          ) : (
            messages.map(message => (
              <div
                key={message.id}
                className={`border rounded-lg p-4 ${getMessageBgColor(message.type)}`}
              >
                <div className="flex items-start space-x-3">
                  {getMessageIcon(message.type)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{message.title}</h4>
                      {message.metric && (
                        <div className="flex items-center space-x-2 text-sm">
                          {getTrendIcon(message.metric.trend)}
                          <span className="font-medium">{message.metric.change > 0 ? '+' : ''}{message.metric.change}</span>
                        </div>
                      )}
                    </div>
                    
                    <p className="text-gray-700 mb-3">{message.message}</p>
                    
                    {message.actionable && message.actions && (
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-2">Recommended Actions:</p>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {message.actions.map((action, index) => (
                            <li key={index} className="flex items-start space-x-2">
                              <span className="text-indigo-500 mt-1">•</span>
                              <span>{action}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Goals Tab */}
      {selectedTab === 'goals' && (
        <div className="space-y-4">
          {goals.map(goal => (
            <div key={goal.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-900">{goal.title}</h4>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getGoalStatusColor(goal.status)}`}>
                  {goal.status.replace('-', ' ')}
                </span>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Progress</span>
                <span className="text-sm font-medium">{goal.current}/{goal.target} {goal.unit}</span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                <div 
                  className="h-2 rounded-full transition-all duration-500 bg-indigo-600"
                  style={{ width: `${Math.min(100, (goal.current / goal.target) * 100)}%` }}
                ></div>
              </div>
              
              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>Deadline: {goal.deadline.toLocaleDateString()}</span>
                <span className="capitalize">{goal.priority} priority</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Progress Tab */}
      {selectedTab === 'progress' && deepWorkMetrics && (
        <div className="space-y-6">
          {/* Overall Progress */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Overall Performance</h4>
            <div className="text-3xl font-bold text-indigo-600 mb-2">{deepWorkMetrics.score}/100</div>
            <div className="text-sm text-gray-600">Your current deep work effectiveness score</div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(deepWorkMetrics.breakdown).map(([key, value]) => {
              const formatKey = (k: string) => {
                return k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              };
              
              return (
                <div key={key} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-900 mb-1">{formatKey(key)}</div>
                  <div className="text-xl font-bold text-gray-700">{Math.round(value)}</div>
                  <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                    <div 
                      className={`h-1 rounded-full transition-all duration-500 ${
                        value >= 80 ? 'bg-green-500' : 
                        value >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${value}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Predictions */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-3">AI Predictions</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Weekly Capacity</div>
                <div className="text-lg font-bold text-gray-900">{deepWorkMetrics.predictions.weeklyCapacity}h</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Burnout Risk</div>
                <div className={`text-lg font-bold ${
                  deepWorkMetrics.predictions.burnoutRisk > 70 ? 'text-red-600' :
                  deepWorkMetrics.predictions.burnoutRisk > 40 ? 'text-amber-600' : 'text-green-600'
                }`}>
                  {deepWorkMetrics.predictions.burnoutRisk}%
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}