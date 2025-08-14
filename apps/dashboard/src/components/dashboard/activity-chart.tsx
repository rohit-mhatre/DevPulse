'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';

interface ActivityData {
  timestamp: number;
  activity_type: string;
  app_name: string;
  duration_seconds: number;
  project_name?: string;
}

interface ActivityChartProps {
  data: ActivityData[];
}

const ACTIVITY_COLORS = {
  code: '#3b82f6',
  build: '#10b981', 
  test: '#f59e0b',
  debug: '#ef4444',
  browsing: '#06b6d4',
  research: '#8b5cf6',
  communication: '#f97316',
  design: '#ec4899',
  document: '#84cc16',
  other: '#6b7280'
};

export function ActivityChart({ data }: ActivityChartProps) {
  const weeklyData = useMemo(() => {
    const last7Days = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = subDays(now, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const dayActivities = data.filter(activity => 
        isWithinInterval(new Date(activity.timestamp), { start: dayStart, end: dayEnd })
      );
      
      const totalMinutes = dayActivities.reduce((sum, activity) => 
        sum + (activity.duration_seconds / 60), 0
      );
      
      last7Days.push({
        date: format(date, 'MMM dd'),
        day: format(date, 'EEE'),
        minutes: Math.round(totalMinutes),
        activities: dayActivities.length
      });
    }
    
    return last7Days;
  }, [data]);

  const activityTypeData = useMemo(() => {
    const typeBreakdown: Record<string, number> = {};
    
    data.forEach(activity => {
      const type = activity.activity_type || 'other';
      typeBreakdown[type] = (typeBreakdown[type] || 0) + (activity.duration_seconds / 60);
    });
    
    return Object.entries(typeBreakdown).map(([type, minutes]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: Math.round(minutes),
      color: ACTIVITY_COLORS[type as keyof typeof ACTIVITY_COLORS] || ACTIVITY_COLORS.other
    })).sort((a, b) => b.value - a.value);
  }, [data]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Activity Analytics</h3>
        <p className="text-sm text-gray-600">7-day overview and activity breakdown</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Bar Chart */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-4">Daily Activity (Last 7 Days)</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="day" 
                  stroke="#6b7280"
                  fontSize={12}
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
                  formatter={(value, name) => [`${value} min`, 'Activity Time']}
                  labelFormatter={(label) => `${label}`}
                />
                <Bar 
                  dataKey="minutes" 
                  fill="#6366f1" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Type Pie Chart */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-4">Activity Type Breakdown</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activityTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={30}
                  outerRadius={70}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {activityTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white'
                  }}
                  formatter={(value) => [`${value} min`, 'Time']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          <div className="mt-4 space-y-2">
            {activityTypeData.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <div 
                    className="w-3 h-3 rounded-full mr-2"
                    style={{ backgroundColor: item.color }}
                  ></div>
                  <span className="text-gray-700">{item.name}</span>
                </div>
                <span className="font-medium text-gray-900">{item.value}m</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}