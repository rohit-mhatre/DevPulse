'use client';

import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  AlertCircle, 
  CheckCircle, 
  Info,
  Lightbulb,
  Calendar,
  Activity,
  Zap
} from 'lucide-react';
import { aiAnalyzer, DeepWorkMetrics, ProductivityInsight } from '@/lib/ai-analytics';
import { mlPatternRecognizer, FlowStateIndicators, EnergyPrediction } from '@/lib/ml-patterns';

interface ActivityData {
  timestamp: number;
  activity_type: string;
  app_name: string;
  duration_seconds: number;
  project_name?: string;
  started_at: string;
}

interface AIInsightsPanelProps {
  data: ActivityData[];
  timeRange: { startDate: string; endDate: string };
}

export function AIInsightsPanel({ data, timeRange }: AIInsightsPanelProps) {
  const [deepWorkMetrics, setDeepWorkMetrics] = useState<DeepWorkMetrics | null>(null);
  const [flowStates, setFlowStates] = useState<FlowStateIndicators[]>([]);
  const [energyPrediction, setEnergyPrediction] = useState<EnergyPrediction | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedInsight, setSelectedInsight] = useState<number>(0);

  useEffect(() => {
    analyzeData();
  }, [data, timeRange]);

  const analyzeData = async () => {
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

      // Run AI analysis
      const [metrics, flows, energy] = await Promise.all([
        aiAnalyzer.calculateDeepWorkScore(activities, timeRange),
        Promise.resolve(mlPatternRecognizer.detectFlowStates(activities)),
        Promise.resolve(mlPatternRecognizer.predictEnergyLevels(activities, new Date().getHours()))
      ]);

      setDeepWorkMetrics(metrics);
      setFlowStates(flows);
      setEnergyPrediction(energy);
    } catch (error) {
      console.error('Error analyzing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInsightIcon = (type: ProductivityInsight['type']) => {
    switch (type) {
      case 'positive':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'negative':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const getInsightBgColor = (type: ProductivityInsight['type']) => {
    switch (type) {
      case 'positive':
        return 'bg-green-50 border-green-200';
      case 'negative':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Brain className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
        </div>
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!deepWorkMetrics) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Brain className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
        </div>
        <div className="text-center text-gray-500">
          No activity data available for analysis
        </div>
      </div>
    );
  }

  const avgFlowProbability = flowStates.length > 0 
    ? flowStates.reduce((sum, f) => sum + f.flowProbability, 0) / flowStates.length 
    : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Brain className="w-6 h-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">AI Productivity Insights</h3>
        <div className="ml-auto text-sm text-gray-500">
          {Math.round(deepWorkMetrics.confidence * 100)}% confidence
        </div>
      </div>

      {/* AI Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Deep Work Score</p>
              <p className="text-2xl font-bold text-blue-600">{deepWorkMetrics.score}</p>
            </div>
            <Target className="w-8 h-8 text-blue-500" />
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-600">
            {deepWorkMetrics.score >= 80 ? (
              <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-500 mr-1" />
            )}
            AI-powered analysis
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Flow State</p>
              <p className="text-2xl font-bold text-green-600">
                {Math.round(avgFlowProbability * 100)}%
              </p>
            </div>
            <Zap className="w-8 h-8 text-green-500" />
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {flowStates.length} sessions analyzed
          </div>
        </div>

        <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Energy Level</p>
              <p className="text-2xl font-bold text-amber-600">
                {energyPrediction ? Math.round(energyPrediction.currentLevel * 100) : 0}%
              </p>
            </div>
            <Activity className="w-8 h-8 text-amber-500" />
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {energyPrediction?.recoveryNeeded ? 'Recovery needed' : 'Optimal level'}
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Performance Breakdown</h4>
        <div className="space-y-3">
          {Object.entries(deepWorkMetrics.breakdown).map(([key, value]) => {
            const formatKey = (k: string) => {
              return k.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            };
            
            return (
              <div key={key}>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{formatKey(key)}</span>
                  <span className="font-medium">{Math.round(value)}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
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
      </div>

      {/* AI Insights */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">Smart Insights</h4>
        <div className="space-y-3">
          {deepWorkMetrics.insights.slice(0, 3).map((insight, index) => (
            <div 
              key={index}
              className={`p-4 rounded-lg border ${getInsightBgColor(insight.type)} cursor-pointer transition-all duration-200 hover:shadow-sm`}
              onClick={() => setSelectedInsight(index)}
            >
              <div className="flex items-start space-x-3">
                {getInsightIcon(insight.type)}
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900 text-sm">{insight.title}</h5>
                  <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                  {insight.actionable && insight.recommendation && (
                    <div className="mt-2 flex items-start space-x-2">
                      <Lightbulb className="w-4 h-4 text-amber-500 mt-0.5" />
                      <p className="text-sm text-gray-700 font-medium">{insight.recommendation}</p>
                    </div>
                  )}
                  <div className="mt-2 text-xs text-gray-500">
                    Confidence: {Math.round(insight.confidence * 100)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Predictions */}
      {energyPrediction && (
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">AI Predictions</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Clock className="w-4 h-4 text-gray-600" />
                <h5 className="font-medium text-gray-900 text-sm">Optimal Work Hours</h5>
              </div>
              <div className="flex flex-wrap gap-2">
                {deepWorkMetrics.predictions.optimalWorkHours.map(hour => (
                  <span 
                    key={hour}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                  >
                    {formatHour(hour)}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Calendar className="w-4 h-4 text-gray-600" />
                <h5 className="font-medium text-gray-900 text-sm">Weekly Capacity</h5>
              </div>
              <div className="text-2xl font-bold text-gray-900">
                {deepWorkMetrics.predictions.weeklyCapacity}h
              </div>
              <div className="text-sm text-gray-600">
                Burnout risk: {deepWorkMetrics.predictions.burnoutRisk}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}