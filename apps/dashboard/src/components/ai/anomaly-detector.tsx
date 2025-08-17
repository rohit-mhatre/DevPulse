'use client';

import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Eye, 
  Calendar,
  Clock,
  Zap,
  Shield,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import { mlPatternRecognizer } from '@/lib/ml-patterns';

interface ActivityData {
  timestamp: number;
  activity_type: string;
  app_name: string;
  duration_seconds: number;
  project_name?: string;
  started_at: string;
}

interface Anomaly {
  date: string;
  type: 'spike' | 'dip' | 'pattern_break' | 'unusual_timing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metrics: {
    actual: number;
    expected: number;
    deviation: number;
  };
  insights: string[];
  recommendations: string[];
  confidence: number;
}

interface AnomalyDetectorProps {
  data: ActivityData[];
  timeRange: { startDate: string; endDate: string };
}

export function AnomalyDetector({ data, timeRange }: AnomalyDetectorProps) {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  useEffect(() => {
    detectAnomalies();
  }, [data, timeRange]);

  const detectAnomalies = async () => {
    setIsLoading(true);
    
    try {
      // Group data by day for analysis
      const dailyData = groupDataByDay(data);
      const detectedAnomalies = await analyzeAnomalies(dailyData);
      setAnomalies(detectedAnomalies);
    } catch (error) {
      console.error('Error detecting anomalies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const groupDataByDay = (activities: ActivityData[]) => {
    const grouped: { [date: string]: ActivityData[] } = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.started_at).toISOString().split('T')[0];
      if (!grouped[date]) grouped[date] = [];
      grouped[date].push(activity);
    });
    
    return Object.entries(grouped).map(([date, dayActivities]) => ({
      date,
      activities: dayActivities,
      totalTime: dayActivities.reduce((sum, a) => sum + a.duration_seconds, 0),
      activityCount: dayActivities.length,
      uniqueApps: new Set(dayActivities.map(a => a.app_name)).size,
      productiveTime: dayActivities
        .filter(a => ['code', 'build', 'test', 'debug', 'design'].includes(a.activity_type))
        .reduce((sum, a) => sum + a.duration_seconds, 0)
    }));
  };

  const analyzeAnomalies = async (dailyData: any[]): Promise<Anomaly[]> => {
    if (dailyData.length < 3) return []; // Need at least 3 days for analysis

    const anomalies: Anomaly[] = [];
    
    // Calculate baseline metrics
    const totalTimes = dailyData.map(d => d.totalTime);
    const productiveTimes = dailyData.map(d => d.productiveTime);
    const activityCounts = dailyData.map(d => d.activityCount);
    
    const meanTotalTime = totalTimes.reduce((sum, t) => sum + t, 0) / totalTimes.length;
    const meanProductiveTime = productiveTimes.reduce((sum, t) => sum + t, 0) / productiveTimes.length;
    const meanActivityCount = activityCounts.reduce((sum, c) => sum + c, 0) / activityCounts.length;
    
    const totalTimeStdDev = calculateStandardDeviation(totalTimes, meanTotalTime);
    const productiveTimeStdDev = calculateStandardDeviation(productiveTimes, meanProductiveTime);
    const activityCountStdDev = calculateStandardDeviation(activityCounts, meanActivityCount);

    // Detect anomalies for each day
    dailyData.forEach(dayData => {
      // Productivity spike detection
      const productivityRatio = dayData.productiveTime / Math.max(1, dayData.totalTime);
      const expectedProductivity = meanProductiveTime / Math.max(1, meanTotalTime);
      
      if (dayData.productiveTime > meanProductiveTime + (2 * productiveTimeStdDev)) {
        anomalies.push({
          date: dayData.date,
          type: 'spike',
          severity: 'medium',
          title: 'Exceptional Productivity Day',
          description: 'You achieved significantly higher productive output than usual.',
          metrics: {
            actual: Math.round(dayData.productiveTime / 3600 * 10) / 10,
            expected: Math.round(meanProductiveTime / 3600 * 10) / 10,
            deviation: Math.round((dayData.productiveTime - meanProductiveTime) / productiveTimeStdDev * 10) / 10
          },
          insights: [
            'Identify what made this day special',
            'Consider replicating successful patterns',
            'Note energy levels and external factors'
          ],
          recommendations: [
            'Document your workflow from this day',
            'Try to replicate the conditions that led to this performance',
            'Schedule similar work patterns for upcoming days'
          ],
          confidence: 0.85
        });
      }

      // Productivity dip detection
      if (dayData.productiveTime < meanProductiveTime - (2 * productiveTimeStdDev) && dayData.totalTime > meanTotalTime * 0.5) {
        const severity = dayData.productiveTime < meanProductiveTime - (3 * productiveTimeStdDev) ? 'high' : 'medium';
        
        anomalies.push({
          date: dayData.date,
          type: 'dip',
          severity,
          title: 'Productivity Decline Detected',
          description: 'Your productive output was significantly lower than your typical performance.',
          metrics: {
            actual: Math.round(dayData.productiveTime / 3600 * 10) / 10,
            expected: Math.round(meanProductiveTime / 3600 * 10) / 10,
            deviation: Math.round((meanProductiveTime - dayData.productiveTime) / productiveTimeStdDev * 10) / 10
          },
          insights: [
            'Check for external factors or distractions',
            'Evaluate energy levels and health',
            'Review task complexity and motivation'
          ],
          recommendations: [
            'Take extra rest and recovery time',
            'Identify and eliminate distractions',
            'Break down complex tasks into smaller parts',
            'Consider adjusting your schedule'
          ],
          confidence: 0.82
        });
      }

      // Excessive context switching detection
      if (dayData.activityCount > meanActivityCount + (2 * activityCountStdDev)) {
        anomalies.push({
          date: dayData.date,
          type: 'pattern_break',
          severity: 'medium',
          title: 'Excessive Task Switching',
          description: 'You switched between tasks more frequently than usual, which may indicate scattered focus.',
          metrics: {
            actual: dayData.activityCount,
            expected: Math.round(meanActivityCount),
            deviation: Math.round((dayData.activityCount - meanActivityCount) / activityCountStdDev * 10) / 10
          },
          insights: [
            'High cognitive load from frequent switching',
            'Possible external interruptions',
            'May indicate unclear priorities'
          ],
          recommendations: [
            'Use time-blocking techniques',
            'Set specific times for different activities',
            'Minimize notifications during focus periods',
            'Clarify daily priorities'
          ],
          confidence: 0.78
        });
      }

      // Unusual timing patterns
      const workingHours = dayData.activities.map(a => new Date(a.started_at).getHours());
      const lateWork = workingHours.filter(h => h >= 20 || h <= 5).length;
      const totalActivities = dayData.activities.length;
      
      if (lateWork > totalActivities * 0.3) {
        anomalies.push({
          date: dayData.date,
          type: 'unusual_timing',
          severity: 'high',
          title: 'Unusual Working Hours',
          description: 'A significant portion of your work occurred during late hours, which may impact sleep and recovery.',
          metrics: {
            actual: Math.round((lateWork / totalActivities) * 100),
            expected: 10, // Expected less than 10%
            deviation: Math.round(((lateWork / totalActivities) - 0.1) * 100)
          },
          insights: [
            'Working late may disrupt circadian rhythms',
            'Could indicate deadline pressure or poor planning',
            'May affect next-day performance'
          ],
          recommendations: [
            'Set strict work cutoff times',
            'Improve time management and planning',
            'Consider redistributing workload',
            'Prioritize sleep for optimal performance'
          ],
          confidence: 0.90
        });
      }
    });

    // Sort by severity and date
    return anomalies.sort((a, b) => {
      const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  };

  const calculateStandardDeviation = (values: number[], mean: number): number => {
    const variance = values.reduce((sum, value) => sum + Math.pow(value - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'medium':
        return <Eye className="w-5 h-5 text-amber-500" />;
      case 'low':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'high':
        return 'bg-red-50 border-red-200';
      case 'medium':
        return 'bg-amber-50 border-amber-200';
      case 'low':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-green-50 border-green-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'spike':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'dip':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'pattern_break':
        return <Zap className="w-4 h-4 text-amber-500" />;
      case 'unusual_timing':
        return <Clock className="w-4 h-4 text-purple-500" />;
      default:
        return <Shield className="w-4 h-4 text-blue-500" />;
    }
  };

  const filteredAnomalies = selectedSeverity === 'all' 
    ? anomalies 
    : anomalies.filter(a => a.severity === selectedSeverity);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          <h3 className="text-lg font-semibold text-gray-900">Anomaly Detection</h3>
        </div>
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          <h3 className="text-lg font-semibold text-gray-900">Anomaly Detection</h3>
        </div>
        
        {/* Severity Filter */}
        <div className="flex bg-gray-100 rounded-lg p-1">
          {[
            { id: 'all', label: 'All' },
            { id: 'high', label: 'High' },
            { id: 'medium', label: 'Medium' },
            { id: 'low', label: 'Low' }
          ].map(severity => (
            <button
              key={severity.id}
              onClick={() => setSelectedSeverity(severity.id as any)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                selectedSeverity === severity.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {severity.label}
            </button>
          ))}
        </div>
      </div>

      {/* Anomalies List */}
      <div className="space-y-4">
        {filteredAnomalies.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Anomalies Detected</h4>
            <p className="text-gray-600">Your productivity patterns are consistent and healthy.</p>
          </div>
        ) : (
          filteredAnomalies.map((anomaly, index) => (
            <div
              key={index}
              className={`border rounded-lg p-4 ${getSeverityColor(anomaly.severity)}`}
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 flex items-center space-x-2 mt-1">
                  {getSeverityIcon(anomaly.severity)}
                  {getTypeIcon(anomaly.type)}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-gray-900">{anomaly.title}</h4>
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(anomaly.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-700 mb-3">{anomaly.description}</p>
                  
                  {/* Metrics */}
                  <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
                    <div>
                      <span className="text-gray-600">Actual:</span>
                      <span className="font-medium ml-1">{anomaly.metrics.actual}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Expected:</span>
                      <span className="font-medium ml-1">{anomaly.metrics.expected}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Deviation:</span>
                      <span className="font-medium ml-1">{anomaly.metrics.deviation}σ</span>
                    </div>
                  </div>
                  
                  {/* Insights and Recommendations */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Insights:</h5>
                      <ul className="space-y-1">
                        {anomaly.insights.map((insight, i) => (
                          <li key={i} className="flex items-start space-x-1">
                            <span className="text-blue-500 mt-1">•</span>
                            <span className="text-gray-600">{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h5 className="font-medium text-gray-900 mb-2">Recommendations:</h5>
                      <ul className="space-y-1">
                        {anomaly.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start space-x-1">
                            <span className="text-green-500 mt-1">•</span>
                            <span className="text-gray-600">{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-500">
                    Confidence: {Math.round(anomaly.confidence * 100)}%
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary Stats */}
      {anomalies.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-gray-900">{anomalies.length}</div>
              <div className="text-sm text-gray-600">Total Anomalies</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-600">
                {anomalies.filter(a => a.severity === 'high' || a.severity === 'critical').length}
              </div>
              <div className="text-sm text-gray-600">High Priority</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">
                {anomalies.filter(a => a.type === 'spike').length}
              </div>
              <div className="text-sm text-gray-600">Positive Spikes</div>
            </div>
            <div>
              <div className="text-lg font-bold text-amber-600">
                {Math.round(anomalies.reduce((sum, a) => sum + a.confidence, 0) / anomalies.length * 100)}%
              </div>
              <div className="text-sm text-gray-600">Avg Confidence</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}