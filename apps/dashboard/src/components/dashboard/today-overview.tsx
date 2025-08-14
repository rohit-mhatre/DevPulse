'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, isToday, startOfHour, endOfHour } from 'date-fns';

interface ActivityData {
  timestamp: number;
  activity_type: string;
  app_name: string;
  duration_seconds: number;
  project_name?: string;
}

interface TodayOverviewProps {
  data: ActivityData[];
}

export function TodayOverview({ data }: TodayOverviewProps) {
  const todayData = useMemo(() => {
    const todayActivities = data.filter(activity => isToday(new Date(activity.timestamp)));
    
    // Group by hour
    const hourlyData: Record<string, number> = {};
    
    // Initialize all hours to 0
    for (let hour = 0; hour < 24; hour++) {
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      hourlyData[hourKey] = 0;
    }
    
    // Aggregate activity duration by hour
    todayActivities.forEach(activity => {
      const date = new Date(activity.timestamp);
      const hour = date.getHours();
      const hourKey = `${hour.toString().padStart(2, '0')}:00`;
      hourlyData[hourKey] += activity.duration_seconds / 60; // Convert to minutes
    });
    
    return Object.entries(hourlyData).map(([hour, minutes]) => ({
      hour,
      minutes: Math.round(minutes)
    }));
  }, [data]);

  const totalMinutes = todayData.reduce((sum, item) => sum + item.minutes, 0);
  const peakHour = todayData.reduce((peak, current) => 
    current.minutes > peak.minutes ? current : peak
  );

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Today's Activity Timeline</h3>
          <p className="text-sm text-gray-600">
            {totalMinutes} minutes total • Peak at {peakHour.hour}
          </p>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-indigo-500 rounded-full mr-2"></div>
            <span className="text-gray-600">Activity</span>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={todayData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="hour" 
              stroke="#6b7280"
              fontSize={12}
              interval="preserveStartEnd"
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: 'white'
              }}
              formatter={(value) => [`${value} min`, 'Activity']}
              labelStyle={{ color: '#d1d5db' }}
            />
            <Line 
              type="monotone" 
              dataKey="minutes" 
              stroke="#6366f1" 
              strokeWidth={2}
              dot={{ fill: '#6366f1', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#6366f1', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-900">{Math.round(totalMinutes / 60 * 10) / 10}h</p>
          <p className="text-xs text-gray-500">Total Time</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-indigo-600">{peakHour.minutes}m</p>
          <p className="text-xs text-gray-500">Peak Hour</p>
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold text-green-600">{Math.round(totalMinutes / Math.max(1, todayData.filter(d => d.minutes > 0).length))}m</p>
          <p className="text-xs text-gray-500">Avg/Hour</p>
        </div>
      </div>
    </div>
  );
}