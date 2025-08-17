/**
 * Machine Learning Pattern Recognition for Productivity Analysis
 * Implements local ML algorithms for pattern detection and prediction
 * Privacy-first: All computations are local, no data leaves the device
 */

import { ActivityRecord } from './database';

// Flow state indicators based on activity patterns
export interface FlowStateIndicators {
  sessionLength: number;
  activityConsistency: number;
  interruptionRate: number;
  cognitiveLoad: number;
  flowProbability: number;
}

// Cognitive load factors
export interface CognitiveLoadMetrics {
  contextSwitches: number;
  multitaskingIndex: number;
  attentionResidue: number;
  overallLoad: number;
}

// Energy level prediction
export interface EnergyPrediction {
  currentLevel: number;
  projectedHourly: number[];
  optimalTaskTiming: { [key: string]: number[] };
  recoveryNeeded: boolean;
}

// Work quality assessment
export interface WorkQualityMetrics {
  score: number;
  confidence: number;
  factors: {
    sessionDepth: number;
    taskComplexity: number;
    outputConsistency: number;
    errorRate: number;
  };
}

export class MLPatternRecognizer {
  private readonly FLOW_STATE_THRESHOLD = 0.7;
  private readonly HIGH_COGNITIVE_LOAD_THRESHOLD = 0.8;
  private readonly SESSION_MIN_LENGTH = 1200; // 20 minutes
  
  /**
   * Detect flow state periods using activity pattern analysis
   */
  detectFlowStates(activities: ActivityRecord[]): FlowStateIndicators[] {
    const sessions = this.groupIntoSessions(activities, 300); // 5-minute gaps
    const flowIndicators: FlowStateIndicators[] = [];

    sessions.forEach(session => {
      const sessionLength = session.reduce((sum, a) => sum + a.duration_seconds, 0);
      
      if (sessionLength < this.SESSION_MIN_LENGTH) {
        return; // Skip short sessions
      }

      // Calculate flow indicators
      const activityConsistency = this.calculateActivityConsistency(session);
      const interruptionRate = this.calculateInterruptionRate(session);
      const cognitiveLoad = this.calculateCognitiveLoad(session).overallLoad;
      
      // Flow probability using weighted factors
      const flowProbability = this.calculateFlowProbability({
        sessionLength,
        activityConsistency,
        interruptionRate,
        cognitiveLoad
      });

      flowIndicators.push({
        sessionLength,
        activityConsistency,
        interruptionRate,
        cognitiveLoad,
        flowProbability
      });
    });

    return flowIndicators;
  }

  /**
   * Calculate cognitive load based on activity complexity and switching
   */
  calculateCognitiveLoad(activities: ActivityRecord[]): CognitiveLoadMetrics {
    if (activities.length === 0) {
      return {
        contextSwitches: 0,
        multitaskingIndex: 0,
        attentionResidue: 0,
        overallLoad: 0
      };
    }

    // Count context switches
    let contextSwitches = 0;
    for (let i = 1; i < activities.length; i++) {
      if (activities[i].app_name !== activities[i - 1].app_name ||
          activities[i].activity_type !== activities[i - 1].activity_type) {
        contextSwitches++;
      }
    }

    // Calculate multitasking index (simultaneous activities)
    const timeWindows = this.createTimeWindows(activities, 300); // 5-minute windows
    const multitaskingIndex = this.calculateMultitaskingIndex(timeWindows);

    // Attention residue (cost of task switching)
    const attentionResidue = this.calculateAttentionResidue(activities);

    // Overall cognitive load score
    const switchRate = contextSwitches / activities.length;
    const overallLoad = Math.min(1.0, 
      switchRate * 0.4 + 
      multitaskingIndex * 0.3 + 
      attentionResidue * 0.3
    );

    return {
      contextSwitches,
      multitaskingIndex,
      attentionResidue,
      overallLoad
    };
  }

  /**
   * Predict energy levels based on activity patterns and circadian rhythms
   */
  predictEnergyLevels(activities: ActivityRecord[], currentHour: number): EnergyPrediction {
    const hourlyPatterns = this.analyzeHourlyEnergyPatterns(activities);
    const currentLevel = this.estimateCurrentEnergyLevel(activities, currentHour);
    
    // Project energy for next 24 hours
    const projectedHourly = this.projectEnergyLevels(hourlyPatterns, currentLevel);
    
    // Determine optimal timing for different task types
    const optimalTaskTiming = this.calculateOptimalTaskTiming(projectedHourly);
    
    // Assess if recovery is needed
    const recoveryNeeded = this.assessRecoveryNeed(activities, currentLevel);

    return {
      currentLevel,
      projectedHourly,
      optimalTaskTiming,
      recoveryNeeded
    };
  }

  /**
   * Assess work quality based on session patterns and outcomes
   */
  assessWorkQuality(activities: ActivityRecord[]): WorkQualityMetrics {
    if (activities.length === 0) {
      return {
        score: 0,
        confidence: 0,
        factors: {
          sessionDepth: 0,
          taskComplexity: 0,
          outputConsistency: 0,
          errorRate: 0
        }
      };
    }

    const sessionDepth = this.calculateSessionDepth(activities);
    const taskComplexity = this.assessTaskComplexity(activities);
    const outputConsistency = this.measureOutputConsistency(activities);
    const errorRate = this.estimateErrorRate(activities);

    // Weighted quality score
    const score = (
      sessionDepth * 0.3 +
      taskComplexity * 0.2 +
      outputConsistency * 0.3 +
      (1 - errorRate) * 0.2
    ) * 100;

    // Confidence based on data quality
    const confidence = Math.min(1.0, activities.length / 50);

    return {
      score: Math.round(score),
      confidence,
      factors: {
        sessionDepth,
        taskComplexity,
        outputConsistency,
        errorRate
      }
    };
  }

  /**
   * Detect productivity anomalies (spikes or dips)
   */
  detectProductivityAnomalies(
    dailyMetrics: Array<{ date: string; score: number; activities: ActivityRecord[] }>
  ): Array<{ date: string; type: 'spike' | 'dip'; severity: number; insights: string[] }> {
    if (dailyMetrics.length < 7) return []; // Need at least a week of data

    const scores = dailyMetrics.map(m => m.score);
    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    const stdDev = Math.sqrt(
      scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
    );

    const anomalies: Array<{ date: string; type: 'spike' | 'dip'; severity: number; insights: string[] }> = [];

    dailyMetrics.forEach(metric => {
      const zScore = Math.abs(metric.score - mean) / stdDev;
      
      if (zScore > 2) { // Significant deviation
        const type = metric.score > mean ? 'spike' : 'dip';
        const severity = Math.min(1, zScore / 3); // Normalize to 0-1
        const insights = this.generateAnomalyInsights(metric, type, dailyMetrics);

        anomalies.push({
          date: metric.date,
          type,
          severity,
          insights
        });
      }
    });

    return anomalies;
  }

  /**
   * Predict optimal work scheduling based on personal patterns
   */
  predictOptimalSchedule(
    activities: ActivityRecord[],
    preferences: { maxHours: number; preferredStartTime: number; breakFrequency: number }
  ): {
    schedule: Array<{ startHour: number; endHour: number; taskType: string; energyLevel: number }>;
    confidence: number;
    reasoning: string[];
  } {
    const energyPrediction = this.predictEnergyLevels(activities, new Date().getHours());
    const cognitivePatterns = this.analyzeCognitivePatterns(activities);
    
    const schedule: Array<{ startHour: number; endHour: number; taskType: string; energyLevel: number }> = [];
    const reasoning: string[] = [];

    // Find peak energy periods for deep work
    const peakHours = energyPrediction.projectedHourly
      .map((energy, hour) => ({ hour, energy }))
      .filter(h => h.energy > 0.7)
      .slice(0, 4); // Top 4 hours

    peakHours.forEach(peak => {
      schedule.push({
        startHour: peak.hour,
        endHour: peak.hour + 2,
        taskType: 'deep-work',
        energyLevel: peak.energy
      });
    });

    reasoning.push(`Scheduled deep work during peak energy hours: ${peakHours.map(p => p.hour).join(', ')}`);

    // Schedule breaks based on cognitive load patterns
    const highLoadPeriods = cognitivePatterns.hourlyLoad
      .map((load, hour) => ({ hour, load }))
      .filter(h => h.load > this.HIGH_COGNITIVE_LOAD_THRESHOLD);

    reasoning.push(`Recommended breaks after high cognitive load periods`);

    const confidence = Math.min(1.0, activities.length / 100);

    return {
      schedule,
      confidence,
      reasoning
    };
  }

  // Private helper methods

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

  private calculateActivityConsistency(session: ActivityRecord[]): number {
    if (session.length <= 1) return 1.0;

    const activityTypes = session.map(a => a.activity_type);
    const uniqueTypes = new Set(activityTypes).size;
    
    // Higher consistency = fewer unique activity types
    return Math.max(0, 1 - (uniqueTypes - 1) / session.length);
  }

  private calculateInterruptionRate(session: ActivityRecord[]): number {
    if (session.length <= 1) return 0;

    let interruptions = 0;
    for (let i = 1; i < session.length; i++) {
      const prevDuration = session[i - 1].duration_seconds;
      // Consider it an interruption if the previous activity was very short
      if (prevDuration < 120) { // Less than 2 minutes
        interruptions++;
      }
    }

    return interruptions / session.length;
  }

  private calculateFlowProbability(indicators: Omit<FlowStateIndicators, 'flowProbability'>): number {
    const { sessionLength, activityConsistency, interruptionRate, cognitiveLoad } = indicators;

    // Normalize session length (optimal around 45-90 minutes)
    const sessionScore = sessionLength > 2700 ? 1.0 : sessionLength / 2700;
    
    // Flow probability calculation
    const flowProbability = (
      sessionScore * 0.3 +
      activityConsistency * 0.3 +
      (1 - interruptionRate) * 0.2 +
      (1 - cognitiveLoad) * 0.2
    );

    return Math.max(0, Math.min(1, flowProbability));
  }

  private createTimeWindows(activities: ActivityRecord[], windowSizeSeconds: number): Array<ActivityRecord[]> {
    if (activities.length === 0) return [];

    const windows: Array<ActivityRecord[]> = [];
    const sortedActivities = [...activities].sort((a, b) => 
      new Date(a.started_at).getTime() - new Date(b.started_at).getTime()
    );

    const startTime = new Date(sortedActivities[0].started_at).getTime();
    const endTime = new Date(sortedActivities[sortedActivities.length - 1].started_at).getTime();

    for (let windowStart = startTime; windowStart < endTime; windowStart += windowSizeSeconds * 1000) {
      const windowEnd = windowStart + windowSizeSeconds * 1000;
      const windowActivities = sortedActivities.filter(a => {
        const activityTime = new Date(a.started_at).getTime();
        return activityTime >= windowStart && activityTime < windowEnd;
      });
      
      if (windowActivities.length > 0) {
        windows.push(windowActivities);
      }
    }

    return windows;
  }

  private calculateMultitaskingIndex(timeWindows: Array<ActivityRecord[]>): number {
    if (timeWindows.length === 0) return 0;

    const multitaskingScores = timeWindows.map(window => {
      const uniqueApps = new Set(window.map(a => a.app_name)).size;
      const uniqueTypes = new Set(window.map(a => a.activity_type)).size;
      
      // Multitasking score based on diversity within time window
      return (uniqueApps + uniqueTypes) / (window.length + 1);
    });

    return multitaskingScores.reduce((sum, score) => sum + score, 0) / multitaskingScores.length;
  }

  private calculateAttentionResidue(activities: ActivityRecord[]): number {
    if (activities.length <= 1) return 0;

    let residueScore = 0;
    for (let i = 1; i < activities.length; i++) {
      const prev = activities[i - 1];
      const curr = activities[i];
      
      // Calculate switching cost based on activity type similarity
      const switchCost = this.calculateSwitchCost(prev.activity_type, curr.activity_type);
      const timeGap = new Date(curr.started_at).getTime() - 
                     new Date(prev.started_at).getTime() - 
                     (prev.duration_seconds * 1000);
      
      // Shorter gaps between different activities increase residue
      const gapPenalty = timeGap < 300000 ? 1 - (timeGap / 300000) : 0; // 5 minutes recovery time
      
      residueScore += switchCost * gapPenalty;
    }

    return Math.min(1.0, residueScore / activities.length);
  }

  private calculateSwitchCost(fromType: string, toType: string): number {
    const activityComplexity: { [key: string]: number } = {
      code: 1.0,
      debug: 0.9,
      test: 0.8,
      design: 0.8,
      build: 0.6,
      research: 0.7,
      document: 0.5,
      communication: 0.3,
      browse: 0.2
    };

    const fromComplexity = activityComplexity[fromType] || 0.5;
    const toComplexity = activityComplexity[toType] || 0.5;
    
    // Higher switch cost when moving between very different complexity levels
    return Math.abs(fromComplexity - toComplexity);
  }

  private analyzeHourlyEnergyPatterns(activities: ActivityRecord[]): { [hour: number]: number } {
    const hourlyEnergy: { [hour: number]: number } = {};
    
    // Initialize all hours
    for (let i = 0; i < 24; i++) {
      hourlyEnergy[i] = 0.5; // Default middle energy
    }

    const hourlyActivity: { [hour: number]: { total: number; productive: number } } = {};
    
    activities.forEach(activity => {
      const hour = new Date(activity.started_at).getHours();
      if (!hourlyActivity[hour]) {
        hourlyActivity[hour] = { total: 0, productive: 0 };
      }
      
      hourlyActivity[hour].total += activity.duration_seconds;
      
      // Consider productive activities as energy indicators
      if (['code', 'build', 'test', 'debug', 'design'].includes(activity.activity_type)) {
        hourlyActivity[hour].productive += activity.duration_seconds;
      }
    });

    // Calculate energy levels based on productivity ratio
    Object.keys(hourlyActivity).forEach(hourStr => {
      const hour = parseInt(hourStr);
      const data = hourlyActivity[hour];
      if (data.total > 0) {
        hourlyEnergy[hour] = Math.min(1.0, data.productive / data.total);
      }
    });

    return hourlyEnergy;
  }

  private estimateCurrentEnergyLevel(activities: ActivityRecord[], currentHour: number): number {
    const recentActivities = activities
      .filter(a => {
        const activityTime = new Date(a.started_at);
        const hoursDiff = (Date.now() - activityTime.getTime()) / (1000 * 60 * 60);
        return hoursDiff <= 2; // Last 2 hours
      });

    if (recentActivities.length === 0) return 0.7; // Default assumption

    const cognitiveLoad = this.calculateCognitiveLoad(recentActivities).overallLoad;
    const recentProductivity = recentActivities
      .filter(a => ['code', 'build', 'test', 'debug'].includes(a.activity_type))
      .reduce((sum, a) => sum + a.duration_seconds, 0) / 
      Math.max(1, recentActivities.reduce((sum, a) => sum + a.duration_seconds, 0));

    // Energy decreases with high cognitive load, increases with productivity
    return Math.max(0.1, Math.min(1.0, 0.8 - (cognitiveLoad * 0.5) + (recentProductivity * 0.3)));
  }

  private projectEnergyLevels(hourlyPatterns: { [hour: number]: number }, currentLevel: number): number[] {
    const projected: number[] = [];
    const currentHour = new Date().getHours();
    
    for (let i = 0; i < 24; i++) {
      const hour = (currentHour + i) % 24;
      const baseLevel = hourlyPatterns[hour] || 0.5;
      
      // Apply fatigue factor as day progresses
      const fatigueMultiplier = i < 12 ? 1.0 : Math.max(0.3, 1.0 - (i - 12) * 0.05);
      
      projected.push(Math.max(0.1, baseLevel * fatigueMultiplier));
    }
    
    return projected;
  }

  private calculateOptimalTaskTiming(energyLevels: number[]): { [key: string]: number[] } {
    const optimalTiming: { [key: string]: number[] } = {
      'deep-work': [],
      'meetings': [],
      'administrative': [],
      'creative': [],
      'learning': []
    };

    energyLevels.forEach((energy, hour) => {
      const actualHour = (new Date().getHours() + hour) % 24;
      
      if (energy > 0.8) {
        optimalTiming['deep-work'].push(actualHour);
        optimalTiming['creative'].push(actualHour);
      } else if (energy > 0.6) {
        optimalTiming['learning'].push(actualHour);
        optimalTiming['meetings'].push(actualHour);
      } else if (energy > 0.4) {
        optimalTiming['administrative'].push(actualHour);
      }
    });

    return optimalTiming;
  }

  private assessRecoveryNeed(activities: ActivityRecord[], currentEnergyLevel: number): boolean {
    const recentHighIntensity = activities
      .filter(a => {
        const hoursDiff = (Date.now() - new Date(a.started_at).getTime()) / (1000 * 60 * 60);
        return hoursDiff <= 6 && ['code', 'debug', 'build'].includes(a.activity_type);
      })
      .reduce((sum, a) => sum + a.duration_seconds, 0);

    const intensityThreshold = 4 * 3600; // 4 hours of intensive work
    
    return currentEnergyLevel < 0.3 || recentHighIntensity > intensityThreshold;
  }

  private calculateSessionDepth(activities: ActivityRecord[]): number {
    const sessions = this.groupIntoSessions(activities, 300);
    
    const depthScores = sessions.map(session => {
      const avgDuration = session.reduce((sum, a) => sum + a.duration_seconds, 0) / session.length;
      const focusActivities = session.filter(a => 
        ['code', 'build', 'test', 'debug', 'design'].includes(a.activity_type)
      ).length;
      
      const focusRatio = focusActivities / session.length;
      const durationScore = Math.min(1.0, avgDuration / 1800); // Normalize to 30 minutes
      
      return focusRatio * 0.7 + durationScore * 0.3;
    });

    return depthScores.length > 0 
      ? depthScores.reduce((sum, score) => sum + score, 0) / depthScores.length 
      : 0;
  }

  private assessTaskComplexity(activities: ActivityRecord[]): number {
    const complexityWeights: { [key: string]: number } = {
      code: 1.0,
      debug: 0.9,
      design: 0.8,
      test: 0.7,
      build: 0.6,
      research: 0.7,
      document: 0.4,
      communication: 0.3,
      browse: 0.2
    };

    const totalTime = activities.reduce((sum, a) => sum + a.duration_seconds, 0);
    const weightedTime = activities.reduce((sum, a) => {
      const weight = complexityWeights[a.activity_type] || 0.5;
      return sum + (a.duration_seconds * weight);
    }, 0);

    return totalTime > 0 ? weightedTime / totalTime : 0;
  }

  private measureOutputConsistency(activities: ActivityRecord[]): number {
    // Group activities by day and measure daily consistency
    const dailyGroups = this.groupActivitiesByDay(activities);
    const dailyScores: number[] = [];

    Object.values(dailyGroups).forEach(dayActivities => {
      const productiveTime = dayActivities
        .filter(a => ['code', 'build', 'test', 'debug', 'design'].includes(a.activity_type))
        .reduce((sum, a) => sum + a.duration_seconds, 0);
      
      const totalTime = dayActivities.reduce((sum, a) => sum + a.duration_seconds, 0);
      const dayScore = totalTime > 0 ? productiveTime / totalTime : 0;
      dailyScores.push(dayScore);
    });

    if (dailyScores.length === 0) return 0;

    // Calculate coefficient of variation (lower = more consistent)
    const mean = dailyScores.reduce((sum, score) => sum + score, 0) / dailyScores.length;
    const variance = dailyScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / dailyScores.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;

    return Math.max(0, 1 - cv);
  }

  private estimateErrorRate(activities: ActivityRecord[]): number {
    // Heuristic: high context switching and short debugging sessions indicate errors
    const debugTime = activities
      .filter(a => a.activity_type === 'debug')
      .reduce((sum, a) => sum + a.duration_seconds, 0);
    
    const totalProductiveTime = activities
      .filter(a => ['code', 'build', 'test', 'debug'].includes(a.activity_type))
      .reduce((sum, a) => sum + a.duration_seconds, 0);

    const errorIndicator = totalProductiveTime > 0 ? debugTime / totalProductiveTime : 0;
    
    // Normalize to 0-1 range (20% debug time = high error rate)
    return Math.min(1.0, errorIndicator / 0.2);
  }

  private groupActivitiesByDay(activities: ActivityRecord[]): { [date: string]: ActivityRecord[] } {
    const grouped: { [date: string]: ActivityRecord[] } = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.started_at).toISOString().split('T')[0];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(activity);
    });
    
    return grouped;
  }

  private generateAnomalyInsights(
    metric: { date: string; score: number; activities: ActivityRecord[] },
    type: 'spike' | 'dip',
    allMetrics: Array<{ date: string; score: number; activities: ActivityRecord[] }>
  ): string[] {
    const insights: string[] = [];
    
    if (type === 'spike') {
      const longSessions = metric.activities.filter(a => a.duration_seconds > 3600).length;
      if (longSessions > 0) {
        insights.push(`Had ${longSessions} extended focus sessions`);
      }
      
      const deepWork = metric.activities
        .filter(a => ['code', 'build', 'test'].includes(a.activity_type))
        .reduce((sum, a) => sum + a.duration_seconds, 0);
      
      if (deepWork > 14400) { // 4+ hours
        insights.push('Sustained deep work focus throughout the day');
      }
    } else {
      const contextSwitches = this.calculateCognitiveLoad(metric.activities).contextSwitches;
      if (contextSwitches > metric.activities.length * 0.5) {
        insights.push('High level of context switching may have reduced focus');
      }
      
      const shortActivities = metric.activities.filter(a => a.duration_seconds < 300).length;
      if (shortActivities > metric.activities.length * 0.7) {
        insights.push('Many short activities suggest fragmented attention');
      }
    }
    
    return insights;
  }

  private analyzeCognitivePatterns(activities: ActivityRecord[]): {
    hourlyLoad: number[];
    peakLoadHours: number[];
    averageLoad: number;
  } {
    const hourlyLoad = new Array(24).fill(0);
    const hourlyCounts = new Array(24).fill(0);
    
    activities.forEach(activity => {
      const hour = new Date(activity.started_at).getHours();
      const load = this.calculateCognitiveLoad([activity]).overallLoad;
      
      hourlyLoad[hour] += load;
      hourlyCounts[hour]++;
    });

    // Average the loads
    for (let i = 0; i < 24; i++) {
      if (hourlyCounts[i] > 0) {
        hourlyLoad[i] /= hourlyCounts[i];
      }
    }

    const averageLoad = hourlyLoad.reduce((sum, load) => sum + load, 0) / 24;
    const peakLoadHours = hourlyLoad
      .map((load, hour) => ({ hour, load }))
      .filter(h => h.load > averageLoad + 0.2)
      .map(h => h.hour);

    return {
      hourlyLoad,
      peakLoadHours,
      averageLoad
    };
  }
}

// Export singleton instance
export const mlPatternRecognizer = new MLPatternRecognizer();