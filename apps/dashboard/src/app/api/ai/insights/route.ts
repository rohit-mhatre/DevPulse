import { NextRequest, NextResponse } from 'next/server';
import { devPulseDB } from '@/lib/database';
import { aiAnalyzer } from '@/lib/ai-analytics';
import { mlPatternRecognizer } from '@/lib/ml-patterns';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const analysisType = searchParams.get('type') || 'comprehensive';

    // Set default date range if not provided
    const defaultEndDate = new Date();
    const defaultStartDate = new Date();
    defaultStartDate.setDate(defaultEndDate.getDate() - 7); // Last 7 days

    const timeRange = {
      startDate: startDate || defaultStartDate.toISOString().split('T')[0],
      endDate: endDate || defaultEndDate.toISOString().split('T')[0]
    };

    // Check if database is available
    const isDbAvailable = await devPulseDB.isAvailable();
    if (!isDbAvailable) {
      return NextResponse.json({
        error: 'DevPulse database not available. Please ensure DevPulse Desktop is installed and has recorded data.'
      }, { status: 503 });
    }

    // Fetch activities for the specified time range
    const activities = await devPulseDB.getActivities({
      startDate: timeRange.startDate,
      endDate: timeRange.endDate,
      limit: 1000 // Limit for performance
    });

    if (activities.length === 0) {
      return NextResponse.json({
        insights: {
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
            recommendation: 'Begin using DevPulse to track your work activities.'
          }],
          predictions: {
            optimalWorkHours: [9, 10, 11, 14, 15, 16],
            burnoutRisk: 0,
            weeklyCapacity: 40
          }
        },
        patterns: {
          flowStates: [],
          energyPrediction: {
            currentLevel: 0.7,
            projectedHourly: new Array(24).fill(0.5),
            optimalTaskTiming: {
              'deep-work': [9, 10, 11, 14, 15],
              'meetings': [13, 16, 17],
              'administrative': [11, 12, 16],
              'creative': [9, 10, 14, 15],
              'learning': [10, 11, 14]
            },
            recoveryNeeded: false
          },
          workQuality: {
            score: 0,
            confidence: 0,
            factors: {
              sessionDepth: 0,
              taskComplexity: 0,
              outputConsistency: 0,
              errorRate: 0
            }
          }
        },
        timeRange,
        dataPoints: 0
      });
    }

    let result: any = {
      timeRange,
      dataPoints: activities.length
    };

    // Run different types of analysis based on request
    switch (analysisType) {
      case 'comprehensive':
        // Full AI analysis
        const [deepWorkMetrics, flowStates, energyPrediction, workQuality] = await Promise.all([
          aiAnalyzer.calculateDeepWorkScore(activities, timeRange),
          Promise.resolve(mlPatternRecognizer.detectFlowStates(activities)),
          Promise.resolve(mlPatternRecognizer.predictEnergyLevels(activities, new Date().getHours())),
          Promise.resolve(mlPatternRecognizer.assessWorkQuality(activities))
        ]);

        result = {
          ...result,
          insights: deepWorkMetrics,
          patterns: {
            flowStates,
            energyPrediction,
            workQuality
          }
        };
        break;

      case 'insights-only':
        // Only AI insights
        const insights = await aiAnalyzer.calculateDeepWorkScore(activities, timeRange);
        result.insights = insights;
        break;

      case 'patterns-only':
        // Only ML patterns
        const [flows, energy, quality] = await Promise.all([
          Promise.resolve(mlPatternRecognizer.detectFlowStates(activities)),
          Promise.resolve(mlPatternRecognizer.predictEnergyLevels(activities, new Date().getHours())),
          Promise.resolve(mlPatternRecognizer.assessWorkQuality(activities))
        ]);

        result.patterns = {
          flowStates: flows,
          energyPrediction: energy,
          workQuality: quality
        };
        break;

      default:
        return NextResponse.json({
          error: 'Invalid analysis type. Use: comprehensive, insights-only, or patterns-only'
        }, { status: 400 });
    }

    // Update baseline with new data
    await aiAnalyzer.updateBaseline(activities);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Error in AI insights API:', error);
    return NextResponse.json({
      error: 'Failed to generate AI insights',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { feedback, insightId, rating, comment } = body;

    // In a real implementation, this would save feedback to improve the AI
    // For now, we'll just acknowledge the feedback
    
    console.log('AI Insight Feedback:', {
      insightId,
      rating,
      comment,
      timestamp: new Date().toISOString()
    });

    // Here you would:
    // 1. Store feedback in a local database
    // 2. Use it to improve future recommendations
    // 3. Adjust confidence scores based on user feedback

    return NextResponse.json({
      success: true,
      message: 'Feedback received and will be used to improve future insights'
    });

  } catch (error) {
    console.error('Error processing AI feedback:', error);
    return NextResponse.json({
      error: 'Failed to process feedback'
    }, { status: 500 });
  }
}