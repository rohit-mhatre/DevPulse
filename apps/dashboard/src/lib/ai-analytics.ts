/**
 * AI-Powered Productivity Analytics Engine
 * Provides intelligent insights into productivity patterns using local ML algorithms
 * Privacy-first: All processing happens locally, no external AI APIs
 */

import { ActivityRecord, devPulseDB } from './database';

// Activity scoring weights based on productivity research
const ACTIVITY_TYPE_WEIGHTS = {
  code: 1.0,
  build: 0.9,
  test: 0.9,
  debug: 0.85,
  design: 0.8,
  research: 0.75,
  document: 0.7,
  review: 0.7,
  meeting: 0.5,
  communication: 0.4,
  browse: 0.2,
  social: 0.1,
  entertainment: 0.0
};

// Time of day productivity patterns (24-hour format)
const HOURLY_PRODUCTIVITY_BASELINE = [
  0.3, 0.2, 0.1, 0.1, 0.1, 0.2, // 0-5: Night/Early morning
  0.4, 0.6, 0.8, 0.9, 1.0, 0.9, // 6-11: Morning peak
  0.7, 0.8, 0.9, 1.0, 0.9, 0.8, // 12-17: Afternoon
  0.6, 0.5, 0.4, 0.4, 0.3, 0.3  // 18-23: Evening
];

export interface ProductivityInsight {
  type: 'positive' | 'neutral' | 'negative';
  category: 'focus' | 'timing' | 'balance' | 'efficiency' | 'patterns';
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  recommendation?: string;
}

export interface DeepWorkMetrics {
  score: number;
  confidence: number;
  breakdown: {
    activityQuality: number;
    focusEffectiveness: number;
    timeOptimization: number;
    contextSwitching: number;
    consistencyBonus: number;
  };
  insights: ProductivityInsight[];
  predictions: {
    optimalWorkHours: number[];
    burnoutRisk: number;
    weeklyCapacity: number;
  };
}

export interface PersonalizedBaseline {
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  averageProductivity: number;
  peakHours: number[];
  lowEnergyHours: number[];
  optimalSessionLength: number;
  contextSwitchingTolerance: number;
  workPatterns: {
    preferredActivities: string[];
    strongDays: string[];
    weeklyRhythm: number[];
  };
}

export class AIProductivityAnalyzer {
  private baseline: PersonalizedBaseline | null = null;
  private readonly MIN_DATA_POINTS = 50; // Minimum activities for reliable analysis

  constructor() {
    this.loadBaseline();
  }

  /**
   * Calculate comprehensive deep work score with AI insights
   */
  async calculateDeepWorkScore(
    activities: ActivityRecord[],
    timeRange: { startDate: string; endDate: string }
  ): Promise<DeepWorkMetrics> {
    if (activities.length === 0) {
      return this.getEmptyMetrics();
    }

    // Core scoring components
    const activityQuality = this.analyzeActivityQuality(activities);
    const focusEffectiveness = this.analyzeFocusEffectiveness(activities);
    const timeOptimization = this.analyzeTimeOptimization(activities);
    const contextSwitching = this.analyzeContextSwitching(activities);
    const consistencyBonus = this.analyzeConsistency(activities);

    // Calculate weighted composite score
    const score = Math.round(
      activityQuality * 0.3 +
      focusEffectiveness * 0.25 +
      timeOptimization * 0.2 +
      contextSwitching * 0.15 +
      consistencyBonus * 0.1
    );

    // Generate AI insights
    const insights = await this.generateInsights(activities, {
      activityQuality,
      focusEffectiveness,
      timeOptimization,
      contextSwitching,
      consistencyBonus
    });

    // Make predictions
    const predictions = this.generatePredictions(activities);

    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(activities);

    return {
      score: Math.max(0, Math.min(100, score)),
      confidence,
      breakdown: {
        activityQuality,
        focusEffectiveness,
        timeOptimization,
        contextSwitching,
        consistencyBonus
      },
      insights,
      predictions
    };
  }

  /**
   * Analyze quality of activities based on type and duration
   */
  private analyzeActivityQuality(activities: ActivityRecord[]): number {
    if (activities.length === 0) return 0;

    const totalTime = activities.reduce((sum, a) => sum + a.duration_seconds, 0);
    const weightedTime = activities.reduce((sum, a) => {
      const weight = ACTIVITY_TYPE_WEIGHTS[a.activity_type as keyof typeof ACTIVITY_TYPE_WEIGHTS] || 0.5;
      return sum + (a.duration_seconds * weight);
    }, 0);

    const qualityScore = totalTime > 0 ? (weightedTime / totalTime) * 100 : 0;
    
    // Bonus for deep work activities
    const deepWorkTime = activities
      .filter(a => ['code', 'build', 'test', 'debug', 'design'].includes(a.activity_type))
      .reduce((sum, a) => sum + a.duration_seconds, 0);
    
    const deepWorkBonus = totalTime > 0 ? (deepWorkTime / totalTime) * 20 : 0;

    return Math.min(100, qualityScore + deepWorkBonus);
  }

  /**
   * Analyze focus effectiveness based on session lengths and interruptions
   */
  private analyzeFocusEffectiveness(activities: ActivityRecord[]): number {
    if (activities.length === 0) return 0;

    // Group activities into focus sessions (activities within 5 minutes of each other)
    const sessions = this.groupIntoSessions(activities, 300); // 5 minutes gap
    
    let effectivenessScore = 0;
    const sessionScores: number[] = [];

    sessions.forEach(session => {
      const sessionDuration = session.reduce((sum, a) => sum + a.duration_seconds, 0);
      const focusActivities = session.filter(a => 
        ['code', 'build', 'test', 'debug', 'design'].includes(a.activity_type)
      );
      
      // Session quality based on duration and focus ratio
      const focusRatio = session.length > 0 ? focusActivities.length / session.length : 0;
      const durationScore = Math.min(100, (sessionDuration / 3600) * 50); // Max score at 2 hours
      const sessionScore = (focusRatio * 70) + (durationScore * 0.3);
      
      sessionScores.push(sessionScore);
    });

    effectivenessScore = sessionScores.length > 0 
      ? sessionScores.reduce((sum, score) => sum + score, 0) / sessionScores.length 
      : 0;

    // Bonus for consistent long sessions
    const longSessions = sessions.filter(s => 
      s.reduce((sum, a) => sum + a.duration_seconds, 0) > 1800 // 30+ minute sessions
    );
    const longSessionBonus = (longSessions.length / Math.max(1, sessions.length)) * 15;

    return Math.min(100, effectivenessScore + longSessionBonus);
  }

  /**
   * Analyze time optimization based on productivity patterns
   */
  private analyzeTimeOptimization(activities: ActivityRecord[]): number {
    if (activities.length === 0) return 0;

    let optimizationScore = 0;
    const hourlyActivity = new Array(24).fill(0);
    const hourlyProductivity = new Array(24).fill(0);

    // Analyze hourly patterns
    activities.forEach(activity => {
      const hour = new Date(activity.started_at).getHours();
      const weight = ACTIVITY_TYPE_WEIGHTS[activity.activity_type as keyof typeof ACTIVITY_TYPE_WEIGHTS] || 0.5;
      
      hourlyActivity[hour] += activity.duration_seconds;
      hourlyProductivity[hour] += activity.duration_seconds * weight;
    });

    // Compare with optimal timing patterns
    let timeAlignmentScore = 0;
    for (let hour = 0; hour < 24; hour++) {
      if (hourlyActivity[hour] > 0) {
        const productivityRatio = hourlyProductivity[hour] / hourlyActivity[hour];
        const optimalRatio = HOURLY_PRODUCTIVITY_BASELINE[hour];
        const alignment = 1 - Math.abs(productivityRatio - optimalRatio);
        timeAlignmentScore += alignment * (hourlyActivity[hour] / activities.reduce((sum, a) => sum + a.duration_seconds, 0));
      }
    }

    optimizationScore = timeAlignmentScore * 100;

    // Bonus for working during peak hours (9-11 AM, 2-4 PM)
    const peakHourWork = [9, 10, 14, 15].reduce((sum, hour) => sum + hourlyActivity[hour], 0);
    const totalWork = hourlyActivity.reduce((sum, time) => sum + time, 0);
    const peakBonus = totalWork > 0 ? (peakHourWork / totalWork) * 20 : 0;

    return Math.min(100, optimizationScore + peakBonus);
  }

  /**
   * Analyze context switching frequency and impact
   */
  private analyzeContextSwitching(activities: ActivityRecord[]): number {
    if (activities.length <= 1) return 100;

    let switches = 0;
    let rapidSwitches = 0;
    
    for (let i = 1; i < activities.length; i++) {
      const prev = activities[i - 1];
      const curr = activities[i];
      
      // Count as switch if different app or activity type
      if (prev.app_name !== curr.app_name || prev.activity_type !== curr.activity_type) {
        switches++;
        
        // Rapid switch if less than 2 minutes
        if (prev.duration_seconds < 120) {
          rapidSwitches++;
        }
      }
    }

    const switchRate = switches / activities.length;
    const rapidSwitchRate = rapidSwitches / activities.length;
    
    // Lower switch rates are better
    const switchScore = Math.max(0, 100 - (switchRate * 200));
    const rapidSwitchPenalty = rapidSwitchRate * 50;
    
    return Math.max(0, switchScore - rapidSwitchPenalty);
  }

  /**
   * Analyze consistency patterns over time
   */
  private analyzeConsistency(activities: ActivityRecord[]): number {
    if (activities.length === 0) return 0;

    // Group by day
    const dailyActivities = this.groupActivitiesByDay(activities);
    const dailyScores: number[] = [];

    Object.values(dailyActivities).forEach(dayActivities => {
      const dayScore = this.analyzeActivityQuality(dayActivities);
      dailyScores.push(dayScore);
    });

    if (dailyScores.length === 0) return 0;

    // Calculate consistency (lower variance is better)
    const meanScore = dailyScores.reduce((sum, score) => sum + score, 0) / dailyScores.length;
    const variance = dailyScores.reduce((sum, score) => sum + Math.pow(score - meanScore, 2), 0) / dailyScores.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Normalize consistency score (lower std dev = higher consistency)
    const consistencyScore = Math.max(0, 100 - (standardDeviation * 2));
    
    return consistencyScore;
  }

  /**
   * Generate AI-powered insights based on activity patterns
   */
  private async generateInsights(
    activities: ActivityRecord[], 
    breakdown: DeepWorkMetrics['breakdown']
  ): Promise<ProductivityInsight[]> {
    const insights: ProductivityInsight[] = [];

    // Focus quality insights
    if (breakdown.focusEffectiveness < 60) {
      insights.push({
        type: 'negative',
        category: 'focus',
        title: 'Focus Sessions Need Improvement',
        description: 'Your focus sessions are being interrupted frequently or are too short to achieve deep work.',
        confidence: 0.85,
        actionable: true,
        recommendation: 'Try using the Pomodoro technique with 25-50 minute focused blocks, and turn off notifications during deep work.'
      });
    } else if (breakdown.focusEffectiveness > 80) {
      insights.push({
        type: 'positive',
        category: 'focus',
        title: 'Excellent Focus Quality',
        description: 'You maintain strong focus during work sessions with minimal interruptions.',
        confidence: 0.9,
        actionable: false
      });
    }

    // Time optimization insights
    const hourlyDistribution = this.analyzeHourlyDistribution(activities);
    const workingDuringPeakHours = hourlyDistribution.peakHours.reduce((sum, hour) => sum + hour, 0) > 0;
    
    if (!workingDuringPeakHours && breakdown.timeOptimization < 70) {
      insights.push({
        type: 'neutral',
        category: 'timing',
        title: 'Optimize Your Work Schedule',
        description: 'You could increase productivity by aligning your most challenging work with your natural energy peaks.',
        confidence: 0.75,
        actionable: true,
        recommendation: 'Schedule your most important deep work tasks between 9-11 AM or 2-4 PM when cognitive performance typically peaks.'
      });
    }

    // Context switching insights
    if (breakdown.contextSwitching < 50) {
      insights.push({
        type: 'negative',
        category: 'efficiency',
        title: 'Excessive Context Switching',
        description: 'Frequent switching between apps and tasks is reducing your cognitive efficiency.',
        confidence: 0.9,
        actionable: true,
        recommendation: 'Batch similar tasks together and use time blocking to minimize context switches. Consider using focus apps to limit distractions.'
      });
    }

    // Activity quality insights
    const lowQualityActivities = activities.filter(a => 
      (ACTIVITY_TYPE_WEIGHTS[a.activity_type as keyof typeof ACTIVITY_TYPE_WEIGHTS] || 0.5) < 0.3
    );
    
    if (lowQualityActivities.length > activities.length * 0.3) {
      insights.push({
        type: 'negative',
        category: 'balance',
        title: 'High Proportion of Low-Value Activities',
        description: 'A significant portion of your time is spent on activities that don\'t directly contribute to deep work.',
        confidence: 0.8,
        actionable: true,
        recommendation: 'Review your daily activities and try to delegate, automate, or eliminate low-value tasks. Focus more time on coding, designing, and problem-solving.'
      });
    }

    // Consistency insights
    if (breakdown.consistencyBonus > 80) {
      insights.push({
        type: 'positive',
        category: 'patterns',
        title: 'Strong Consistency',
        description: 'You maintain consistent productivity patterns, which helps build sustainable work habits.',
        confidence: 0.85,
        actionable: false
      });
    } else if (breakdown.consistencyBonus < 40) {
      insights.push({
        type: 'neutral',
        category: 'patterns',
        title: 'Inconsistent Productivity Patterns',
        description: 'Your productivity varies significantly day to day, which might indicate energy management issues.',
        confidence: 0.7,
        actionable: true,
        recommendation: 'Try to establish more consistent daily routines, including regular sleep, exercise, and work start times.'
      });
    }

    return insights.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Generate predictions for optimal work scheduling and capacity
   */
  private generatePredictions(activities: ActivityRecord[]): DeepWorkMetrics['predictions'] {
    const hourlyDistribution = this.analyzeHourlyDistribution(activities);
    
    // Find optimal work hours based on productivity patterns
    const productivityByHour = hourlyDistribution.hourlyProductivity.map((prod, hour) => ({
      hour,
      productivity: prod,
      activity: hourlyDistribution.hourlyActivity[hour]
    }));
    
    const optimalWorkHours = productivityByHour
      .filter(h => h.activity > 0)
      .sort((a, b) => b.productivity - a.productivity)
      .slice(0, 6)
      .map(h => h.hour)
      .sort((a, b) => a - b);

    // Calculate burnout risk based on intensity and sustainability
    const totalWork = activities.reduce((sum, a) => sum + a.duration_seconds, 0);
    const avgDailyWork = totalWork / Math.max(1, this.getUniqueDays(activities));
    const intensiveWork = activities.filter(a => 
      ['code', 'build', 'test', 'debug'].includes(a.activity_type)
    ).reduce((sum, a) => sum + a.duration_seconds, 0);
    
    const burnoutRisk = Math.min(100, Math.max(0, 
      (avgDailyWork / 28800) * 50 + // 8 hours baseline
      (intensiveWork / totalWork) * 30 + // High intensity work ratio
      (100 - hourlyDistribution.consistency) * 0.2 // Inconsistency factor
    ));

    // Predict weekly capacity based on current patterns
    const weeklyCapacity = avgDailyWork * 5; // Assume 5 working days

    return {
      optimalWorkHours: optimalWorkHours.length > 0 ? optimalWorkHours : [9, 10, 11, 14, 15, 16],
      burnoutRisk: Math.round(burnoutRisk),
      weeklyCapacity: Math.round(weeklyCapacity / 3600) // Convert to hours
    };
  }

  /**
   * Calculate confidence score based on data quality and quantity
   */
  private calculateConfidence(activities: ActivityRecord[]): number {
    if (activities.length === 0) return 0;

    // Base confidence on data quantity
    const quantityScore = Math.min(100, (activities.length / this.MIN_DATA_POINTS) * 60);
    
    // Quality factors
    const timeSpan = this.getTimeSpanDays(activities);
    const timeSpanScore = Math.min(40, timeSpan * 2); // Max 40 points for 20+ days
    
    const totalConfidence = quantityScore + timeSpanScore;
    return Math.min(100, totalConfidence);
  }

  /**
   * Helper methods
   */
  private groupIntoSessions(activities: ActivityRecord[], maxGapSeconds: number): ActivityRecord[][] {
    if (activities.length === 0) return [];

    const sortedActivities = [...activities].sort((a, b) => 
      new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
    );

    const sessions: ActivityRecord[][] = [];
    let currentSession: ActivityRecord[] = [sortedActivities[0]];

    for (let i = 1; i < sortedActivities.length; i++) {
      const prevEnd = new Date(sortedActivities[i - 1].started_at).getTime() + 
                     (sortedActivities[i - 1].duration_seconds * 1000);
      const currentStart = new Date(sortedActivities[i].started_at).getTime();
      
      if (currentStart - prevEnd <= maxGapSeconds * 1000) {
        currentSession.push(sortedActivities[i]);
      } else {
        sessions.push(currentSession);
        currentSession = [sortedActivities[i]];
      }
    }
    sessions.push(currentSession);

    return sessions;
  }

  private groupActivitiesByDay(activities: ActivityRecord[]): Record<string, ActivityRecord[]> {
    const grouped: Record<string, ActivityRecord[]> = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.started_at).toISOString().split('T')[0];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(activity);
    });
    
    return grouped;
  }

  private analyzeHourlyDistribution(activities: ActivityRecord[]) {
    const hourlyActivity = new Array(24).fill(0);
    const hourlyProductivity = new Array(24).fill(0);

    activities.forEach(activity => {
      const hour = new Date(activity.started_at).getHours();
      const weight = ACTIVITY_TYPE_WEIGHTS[activity.activity_type as keyof typeof ACTIVITY_TYPE_WEIGHTS] || 0.5;
      
      hourlyActivity[hour] += activity.duration_seconds;
      hourlyProductivity[hour] += activity.duration_seconds * weight;
    });

    // Calculate consistency
    const nonZeroHours = hourlyActivity.filter(h => h > 0);
    const mean = nonZeroHours.reduce((sum, h) => sum + h, 0) / Math.max(1, nonZeroHours.length);
    const variance = nonZeroHours.reduce((sum, h) => sum + Math.pow(h - mean, 2), 0) / Math.max(1, nonZeroHours.length);
    const consistency = Math.max(0, 100 - Math.sqrt(variance) / mean * 100);

    return {
      hourlyActivity,
      hourlyProductivity,
      peakHours: hourlyActivity.map((activity, hour) => activity > mean ? hour : -1).filter(h => h >= 0),
      consistency
    };
  }

  private getUniqueDays(activities: ActivityRecord[]): number {
    const uniqueDays = new Set(
      activities.map(a => new Date(a.started_at).toISOString().split('T')[0])
    );
    return uniqueDays.size;
  }

  private getTimeSpanDays(activities: ActivityRecord[]): number {
    if (activities.length === 0) return 0;
    
    const dates = activities.map(a => new Date(a.started_at).getTime());
    const minDate = Math.min(...dates);
    const maxDate = Math.max(...dates);
    
    return Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));
  }

  private getEmptyMetrics(): DeepWorkMetrics {
    return {
      score: 0,
      confidence: 0,
      breakdown: {
        activityQuality: 0,
        focusEffectiveness: 0,
        timeOptimization: 0,
        contextSwitching: 0,
        consistencyBonus: 0
      },
      insights: [{
        type: 'neutral',
        category: 'focus',
        title: 'No Data Available',
        description: 'Start tracking your activities to receive AI-powered productivity insights.',
        confidence: 1.0,
        actionable: true,
        recommendation: 'Begin using DevPulse to track your work activities. The AI will provide personalized insights after collecting sufficient data.'
      }],
      predictions: {
        optimalWorkHours: [9, 10, 11, 14, 15, 16],
        burnoutRisk: 0,
        weeklyCapacity: 40
      }
    };
  }

  /**
   * Load or create personalized baseline
   */
  private async loadBaseline(): Promise<void> {
    // In a real implementation, this would load from a local store
    // For now, we'll create a default baseline that adapts over time
    this.baseline = {
      userId: 'default',
      createdAt: new Date(),
      updatedAt: new Date(),
      averageProductivity: 75,
      peakHours: [9, 10, 11, 14, 15],
      lowEnergyHours: [13, 17, 18],
      optimalSessionLength: 45 * 60, // 45 minutes
      contextSwitchingTolerance: 0.3,
      workPatterns: {
        preferredActivities: ['code', 'design', 'test'],
        strongDays: ['Tuesday', 'Wednesday', 'Thursday'],
        weeklyRhythm: [0.8, 1.0, 1.0, 0.9, 0.7, 0.3, 0.2] // Mon-Sun
      }
    };
  }

  /**
   * Update baseline based on new activity data
   */
  async updateBaseline(activities: ActivityRecord[]): Promise<void> {
    if (!this.baseline || activities.length < this.MIN_DATA_POINTS) return;

    // Adaptive learning logic would go here
    // For now, we'll update the timestamp
    this.baseline.updatedAt = new Date();
  }
}

// Singleton instance for app-wide use
export const aiAnalyzer = new AIProductivityAnalyzer();