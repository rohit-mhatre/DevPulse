'use client';

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts/es6';
import { isToday } from 'date-fns';

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
    // Use all data since it's already filtered by the API server for the selected date
    const todayActivities = data;
    
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
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-primary">Today&apos;s Activity Timeline</h3>
          <p className="text-sm text-secondary">
            {totalMinutes} minutes total • Peak at {peakHour.hour}
          </p>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
            <span className="text-secondary">Activity</span>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={todayData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
            <XAxis 
              dataKey="hour" 
              stroke="#9ca3af"
              fontSize={12}
              interval="preserveStartEnd"
            />
            <YAxis 
              stroke="#9ca3af"
              fontSize={12}
              label={{ value: 'Minutes', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                color: '#374151',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
              }}
              formatter={(value) => [`${value} min`, 'Activity']}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Line 
              type="monotone" 
              dataKey="minutes" 
              stroke="#2563eb" 
              strokeWidth={2}
              dot={{ fill: '#2563eb', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: '#2563eb', strokeWidth: 2 }}
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
          <p className="text-2xl font-bold text-blue-600">{peakHour.minutes}m</p>
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