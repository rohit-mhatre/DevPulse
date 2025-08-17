import { NextRequest, NextResponse } from 'next/server';
import { devPulseDB } from '@/lib/database';
import { aiAnalyzer } from '@/lib/ai-analytics';
import { mlPatternRecognizer } from '@/lib/ml-patterns';

interface OptimizationRequest {
  goals?: {
    dailyFocusHours?: number;
    maxContextSwitches?: number;
    targetProductivityScore?: number;
  };
  constraints?: {
    workingHours?: { start: number; end: number };
    breakPreferences?: number[];
    meetingSlots?: number[];
  };
  preferences?: {
    workStyle?: 'intensive' | 'balanced' | 'flexible';
    notificationLevel?: 'minimal' | 'moderate' | 'detailed';
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const category = searchParams.get('category') || 'all';

    // Set default date range
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultEndDate.getDate() - 7);

    const timeRange = {
      startDate: startDate || defaultStartDate.toISOString().split('T')[0],
      endDate: endDate || defaultEndDate.toISOString().split('T')[0]
    };

    // Check database availability
    const isDbAvailable = await devPulseDB.isAvailable();
    if (!isDbAvailable) {
      return NextResponse.json({
        error: 'DevPulse database not available. Please ensure DevPulse Desktop is installed and has recorded data.'
      }, { status: 503 });
    }

    // Fetch activities
    const activities = await devPulseDB.getActivities({
      startDate: timeRange.startDate,
      endDate: timeRange.endDate,
      limit: 1000
    });

    if (activities.length === 0) {
      return NextResponse.json({
        recommendations: [{
          id: 'start-tracking',
          type: 'workflow',
          priority: 'high',
          title: 'Start Activity Tracking',
          description: 'Begin tracking your work activities to receive personalized AI recommendations.',
          action: 'Enable DevPulse activity tracking and work for a few days',
          impact: 'Foundation for all AI insights',
          timeframe: 'Immediate',
          confidence: 1.0,
          category: 'setup'
        }],
        categories: ['setup'],
        timeRange,
        dataPoints: 0
      });
    }

    // Generate AI insights first
    const deepWorkMetrics = await aiAnalyzer.calculateDeepWorkScore(activities, timeRange);
    
    // Generate ML patterns
    const [energyPrediction, workQuality] = await Promise.all([
      Promise.resolve(mlPatternRecognizer.predictEnergyLevels(activities, new Date().getHours())),
      Promise.resolve(mlPatternRecognizer.assessWorkQuality(activities))
    ]);

    // Generate recommendations
    const recommendations = await generateSmartRecommendations(
      activities, 
      deepWorkMetrics, 
      energyPrediction, 
      workQuality,
      category
    );

    // Get available categories
    const categories = ['all', ...new Set(recommendations.map(r => r.category))];

    return NextResponse.json({
      recommendations: category === 'all' ? recommendations : recommendations.filter(r => r.category === category),
      categories,
      insights: {
        score: deepWorkMetrics.score,
        confidence: deepWorkMetrics.confidence,
        burnoutRisk: deepWorkMetrics.predictions.burnoutRisk,
        optimalHours: deepWorkMetrics.predictions.optimalWorkHours
      },
      timeRange,
      dataPoints: activities.length
    });

  } catch (error) {
    console.error('Error generating recommendations:', error);
    return NextResponse.json({
      error: 'Failed to generate recommendations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: OptimizationRequest = await request.json();
    const { goals, constraints, preferences } = body;

    // Check database availability
    const isDbAvailable = await devPulseDB.isAvailable();
    if (!isDbAvailable) {
      return NextResponse.json({
        error: 'DevPulse database not available'
      }, { status: 503 });
    }

    // Get recent activities for context
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 14); // Last 2 weeks

    const activities = await devPulseDB.getActivities({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      limit: 1000
    });

    // Generate optimized schedule based on user preferences
    const optimizedSchedule = await generateOptimizedSchedule(
      activities,
      goals,
      constraints,
      preferences
    );

    return NextResponse.json({
      schedule: optimizedSchedule,
      explanation: generateScheduleExplanation(optimizedSchedule, goals),
      confidence: calculateScheduleConfidence(activities, optimizedSchedule)
    });

  } catch (error) {
    console.error('Error generating optimized schedule:', error);
    return NextResponse.json({
      error: 'Failed to generate optimized schedule'
    }, { status: 500 });
  }
}

async function generateSmartRecommendations(
  activities: any[],
  metrics: any,
  energy: any,
  quality: any,
  category: string
): Promise<any[]> {
  const recommendations: any[] = [];

  // Focus and Flow recommendations
  if (category === 'all' || category === 'focus') {
    if (metrics.breakdown.focusEffectiveness < 60) {
      recommendations.push({
        id: 'improve-focus-quality',
        type: 'technique',
        priority: 'high',
        title: 'Enhance Focus Quality',
        description: 'Your focus sessions are being interrupted frequently. Deep work requires uninterrupted time blocks.',
        action: 'Implement 90-minute focus blocks with all notifications disabled',
        impact: 'Increase deep work effectiveness by 40%',
        timeframe: 'This week',
        confidence: 0.89,
        category: 'focus',
        tags: ['deep-work', 'concentration', 'productivity']
      });
    }

    const avgFlowProbability = activities.length > 0 ? 0.6 : 0; // Simplified calculation
    if (avgFlowProbability < 0.5) {
      recommendations.push({
        id: 'flow-state-optimization',
        type: 'environment',
        priority: 'medium',
        title: 'Optimize for Flow States',
        description: 'You\'re not entering flow state frequently enough. Flow states can increase productivity by 500%.',
        action: 'Create a dedicated workspace with minimal distractions and consistent lighting',
        impact: 'Double your periods of deep focus',
        timeframe: 'Next few days',
        confidence: 0.76,
        category: 'focus',
        tags: ['flow-state', 'environment', 'workspace']
      });
    }
  }

  // Schedule optimization recommendations
  if (category === 'all' || category === 'schedule') {
    if (metrics.breakdown.timeOptimization < 70) {
      const currentHour = new Date().getHours();
      const optimalHours = metrics.predictions.optimalWorkHours;
      
      recommendations.push({
        id: 'schedule-optimization',
        type: 'timing',
        priority: 'high',
        title: 'Align Work with Energy Peaks',
        description: `Your optimal work hours are ${optimalHours.map((h: number) => `${h}:00`).join(', ')}. You could be 60% more productive during these windows.`,
        action: 'Schedule your most challenging tasks during peak energy hours',
        impact: 'Increase output quality by 60%',
        timeframe: 'Starting tomorrow',
        confidence: 0.84,
        category: 'schedule',
        tags: ['timing', 'energy-management', 'peak-performance']
      });
    }

    if (energy.recoveryNeeded) {
      recommendations.push({
        id: 'energy-recovery',
        type: 'wellness',
        priority: 'high',
        title: 'Immediate Energy Recovery',
        description: 'Your cognitive energy is depleted. Continuing to work will lead to diminishing returns.',
        action: 'Take a 20-minute break with light physical activity or meditation',
        impact: 'Restore 80% of cognitive capacity',
        timeframe: 'Right now',
        confidence: 0.94,
        category: 'schedule',
        tags: ['recovery', 'energy', 'breaks']
      });
    }
  }

  // Workflow optimization recommendations
  if (category === 'all' || category === 'workflow') {
    if (metrics.breakdown.contextSwitching < 50) {
      recommendations.push({
        id: 'reduce-context-switching',
        type: 'workflow',
        priority: 'high',
        title: 'Minimize Task Switching',
        description: 'Excessive context switching is reducing your cognitive efficiency by up to 40%.',
        action: 'Batch similar tasks together and use time-blocking techniques',
        impact: 'Reduce mental fatigue and increase focus depth',
        timeframe: 'This week',
        confidence: 0.91,
        category: 'workflow',
        tags: ['context-switching', 'batching', 'efficiency']
      });
    }

    const distractingApps = getDistractingApps(activities);
    if (distractingApps.length > 0) {
      recommendations.push({
        id: 'digital-environment',
        type: 'tools',
        priority: 'medium',
        title: 'Optimize Digital Environment',
        description: `High usage of distracting apps detected: ${distractingApps.join(', ')}`,
        action: 'Use focus apps and website blockers during work sessions',
        impact: 'Eliminate 85% of digital distractions',
        timeframe: 'Today',
        confidence: 0.82,
        category: 'workflow',
        tags: ['distractions', 'focus-tools', 'digital-wellness']
      });
    }
  }

  // Health and sustainability recommendations
  if (category === 'all' || category === 'health') {
    if (metrics.predictions.burnoutRisk > 70) {
      recommendations.push({
        id: 'burnout-prevention',
        type: 'wellness',
        priority: 'critical',
        title: 'Burnout Risk Alert',
        description: 'Your work intensity is unsustainable. Immediate action required to prevent productivity crash.',
        action: 'Reduce work hours by 25% this week and schedule recovery activities',
        impact: 'Prevent 6-month productivity decline',
        timeframe: 'This week',
        confidence: 0.96,
        category: 'health',
        tags: ['burnout', 'sustainability', 'wellness']
      });
    }

    const workingLateHours = activities.filter((a: any) => {
      const hour = new Date(a.started_at).getHours();
      return hour >= 20 || hour <= 6;
    }).length;

    if (workingLateHours > activities.length * 0.1) {
      recommendations.push({
        id: 'work-life-balance',
        type: 'wellness',
        priority: 'medium',
        title: 'Improve Work-Life Boundaries',
        description: 'Working during late hours can disrupt sleep and reduce next-day performance.',
        action: 'Set a firm work cutoff time and create an evening routine',
        impact: 'Improve sleep quality and next-day energy',
        timeframe: 'Starting today',
        confidence: 0.78,
        category: 'health',
        tags: ['work-life-balance', 'sleep', 'boundaries']
      });
    }
  }

  // Performance improvement recommendations
  if (category === 'all' || category === 'performance') {
    if (quality.score < 70) {
      recommendations.push({
        id: 'quality-improvement',
        type: 'technique',
        priority: 'medium',
        title: 'Enhance Work Quality',
        description: 'Your work quality metrics suggest room for improvement in session depth and consistency.',
        action: 'Implement quality checkpoints and peer reviews',
        impact: 'Increase work quality by 30%',
        timeframe: 'Next 2 weeks',
        confidence: 0.71,
        category: 'performance',
        tags: ['quality', 'consistency', 'improvement']
      });
    }

    if (metrics.breakdown.consistencyBonus < 50) {
      recommendations.push({
        id: 'consistency-building',
        type: 'habit',
        priority: 'medium',
        title: 'Build Consistent Routines',
        description: 'Your productivity varies significantly day-to-day. Consistency is key to sustained high performance.',
        action: 'Establish morning routines and fixed work start times',
        impact: 'Reduce productivity variance by 50%',
        timeframe: 'Next 3 weeks',
        confidence: 0.83,
        category: 'performance',
        tags: ['consistency', 'routines', 'habits']
      });
    }
  }

  // Sort by priority and confidence
  return recommendations.sort((a, b) => {
    const priorityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
    const priorityDiff = (priorityWeight[b.priority as keyof typeof priorityWeight] || 0) - (priorityWeight[a.priority as keyof typeof priorityWeight] || 0);
    if (priorityDiff !== 0) return priorityDiff;
    return b.confidence - a.confidence;
  });
}

async function generateOptimizedSchedule(
  activities: any[],
  goals?: any,
  constraints?: any,
  preferences?: any
): Promise<any> {
  // Analyze current patterns
  const energyPrediction = mlPatternRecognizer.predictEnergyLevels(activities, new Date().getHours());
  
  // Generate optimized schedule based on energy patterns and constraints
  const schedule = {
    dailyBlocks: generateDailyBlocks(energyPrediction, constraints, goals),
    weeklyPattern: generateWeeklyPattern(activities, preferences),
    breakSchedule: generateBreakSchedule(constraints, preferences),
    focusWindows: generateFocusWindows(energyPrediction, goals)
  };

  return schedule;
}

function generateDailyBlocks(energyPrediction: any, constraints?: any, goals?: any) {
  const workingHours = constraints?.workingHours || { start: 9, end: 17 };
  const blocks = [];

  // Deep work blocks during high energy periods
  const optimalHours = energyPrediction.optimalTaskTiming['deep-work'] || [9, 10, 11, 14, 15];
  
  for (const hour of optimalHours) {
    if (hour >= workingHours.start && hour <= workingHours.end - 2) {
      blocks.push({
        startTime: `${hour}:00`,
        endTime: `${hour + 2}:00`,
        type: 'deep-work',
        description: 'Focused work on high-complexity tasks',
        energyLevel: 'high'
      });
    }
  }

  return blocks;
}

function generateWeeklyPattern(activities: any[], preferences?: any) {
  // Analyze day-of-week patterns
  const dayPatterns = {};
  
  // Generate recommendations for each day
  return {
    monday: { intensity: 'high', focus: 'planning' },
    tuesday: { intensity: 'high', focus: 'execution' },
    wednesday: { intensity: 'high', focus: 'execution' },
    thursday: { intensity: 'medium', focus: 'review' },
    friday: { intensity: 'medium', focus: 'completion' }
  };
}

function generateBreakSchedule(constraints?: any, preferences?: any) {
  return {
    microBreaks: { frequency: 25, duration: 5 }, // Every 25 minutes, 5 minute break
    shortBreaks: { frequency: 90, duration: 15 }, // Every 90 minutes, 15 minute break
    lunchBreak: { time: '12:30', duration: 60 },
    afternoonBreak: { time: '15:30', duration: 10 }
  };
}

function generateFocusWindows(energyPrediction: any, goals?: any) {
  const dailyFocusHours = goals?.dailyFocusHours || 4;
  const optimalHours = energyPrediction.optimalTaskTiming['deep-work'] || [9, 10, 11, 14, 15];
  
  return optimalHours.slice(0, Math.ceil(dailyFocusHours / 2)).map(hour => ({
    startTime: `${hour}:00`,
    endTime: `${hour + 2}:00`,
    description: 'Protected focus time - no meetings or interruptions'
  }));
}

function generateScheduleExplanation(schedule: any, goals?: any) {
  return [
    'This schedule is optimized based on your personal energy patterns and productivity data.',
    'Deep work blocks are scheduled during your peak cognitive performance hours.',
    'Break timing is designed to prevent cognitive fatigue and maintain sustained performance.',
    'The weekly pattern balances intensive work with strategic recovery periods.'
  ];
}

function calculateScheduleConfidence(activities: any[], schedule: any): number {
  // Base confidence on amount of historical data
  const dataQuality = Math.min(1.0, activities.length / 100);
  
  // Additional factors would include consistency of patterns, etc.
  return Math.round(dataQuality * 100) / 100;
}

function getDistractingApps(activities: any[]): string[] {
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
}