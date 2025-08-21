'use client';

import { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts/es6';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { TrendingUp, BarChart3, Activity } from 'lucide-react';

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
  code: '#2563eb',
  build: '#16a34a',
  test: '#eab308',
  debug: '#dc2626',
  browsing: '#06b6d4',
  research: '#9333ea',
  communication: '#f97316',
  design: '#db2777',
  document: '#65a30d',
  other: '#6b7280'
};

export function ActivityChart({ data }: ActivityChartProps) {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(7);

  const weeklyData = useMemo(() => {
    const lastNDays = [];
    const now = new Date();
    
    for (let i = timeRange - 1; i >= 0; i--) {
      const date = subDays(now, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const dayActivities = data.filter(activity => 
        isWithinInterval(new Date(activity.timestamp), { start: dayStart, end: dayEnd })
      );
      
      const totalMinutes = dayActivities.reduce((sum, activity) => 
        sum + (activity.duration_seconds / 60), 0
      );
      
      // Calculate productivity score based on activity types
      const productivityScore = dayActivities.reduce((score, activity) => {
        const multiplier = {
          code: 1.0,
          build: 0.8,
          test: 0.9,
          debug: 0.7,
          research: 0.6,
          design: 0.8,
          document: 0.7,
          communication: 0.4,
          browsing: 0.3,
          other: 0.5
        }[activity.activity_type] || 0.5;
        return score + (activity.duration_seconds / 60) * multiplier;
      }, 0);
      
      lastNDays.push({
        date: format(date, timeRange <= 7 ? 'EEE' : 'MMM dd'),
        fullDate: format(date, 'MMM dd, yyyy'),
        minutes: Math.round(totalMinutes),
        productivity: Math.round(productivityScore),
        activities: dayActivities.length,
        focusTime: dayActivities.filter(a => ['code', 'build', 'test', 'debug'].includes(a.activity_type))
          .reduce((sum, a) => sum + (a.duration_seconds / 60), 0)
      });
    }
    
    return lastNDays;
  }, [data, timeRange]);

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

  const renderChart = () => {
    const commonProps = {
      data: weeklyData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    const commonElements = (
      <>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis 
          dataKey="date" 
          stroke="#9ca3af"
          fontSize={12}
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
          formatter={(value, name) => {
            if (name === 'minutes') return [`${value} min`, 'Total Time'];
            if (name === 'productivity') return [`${value} min`, 'Focus Time'];
            if (name === 'focusTime') return [`${value} min`, 'Deep Work'];
            return [value, name];
          }}
          labelFormatter={(label) => weeklyData.find(d => d.date === label)?.fullDate || label}
        />
      </>
    );

    switch (chartType) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            {commonElements}
            <Line 
              type="monotone" 
              dataKey="minutes" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: '#3b82f6', strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="productivity" 
              stroke="#22c55e" 
              strokeWidth={2}
              dot={{ fill: '#22c55e', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: '#22c55e', strokeWidth: 2 }}
            />
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart {...commonProps}>
            {commonElements}
            <Area 
              type="monotone" 
              dataKey="minutes" 
              stackId="1"
              stroke="#3b82f6" 
              fill="#3b82f6"
              fillOpacity={0.6}
            />
            <Area 
              type="monotone" 
              dataKey="focusTime" 
              stackId="2"
              stroke="#22c55e" 
              fill="#22c55e"
              fillOpacity={0.8}
            />
          </AreaChart>
        );
      default:
        return (
          <BarChart {...commonProps}>
            {commonElements}
            <Bar 
              dataKey="minutes" 
              fill="#3b82f6" 
              radius={[4, 4, 0, 0]}
              opacity={0.8}
            />
            <Bar 
              dataKey="focusTime" 
              fill="#22c55e" 
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );
    }
  };

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-primary mb-2">Activity Analytics</h3>
          <p className="text-sm text-secondary">{timeRange}-day productivity trends and activity breakdown</p>
        </div>
        
        {/* Chart Controls */}
        <div className="flex items-center space-x-4">
          {/* Time Range Selector */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-secondary">Range:</span>
            <select 
              value={timeRange} 
              onChange={(e) => setTimeRange(Number(e.target.value) as 7 | 14 | 30)}
              className="text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
          </div>
          
          {/* Chart Type Selector */}
          <div className="flex items-center border border-gray-200 rounded-md p-1">
            <button
              onClick={() => setChartType('bar')}
              className={`p-2 rounded ${chartType === 'bar' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Bar Chart"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`p-2 rounded ${chartType === 'line' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Line Chart"
            >
              <TrendingUp className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`p-2 rounded ${chartType === 'area' ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              title="Area Chart"
            >
              <Activity className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Interactive Productivity Chart */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-4">Productivity Trends</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
          
          {/* Chart Legend */}
          <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Total Activity</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-gray-600">Focus Time</span>
            </div>
          </div>
        </div>

        {/* Enhanced Activity Type Breakdown */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-4">Activity Type Distribution</h4>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={activityTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {activityTypeData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.color} 
                      stroke={entry.color}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'white',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value, name) => {
                    const percentage = activityTypeData.find(d => d.name === name)?.value || 0;
                    const total = activityTypeData.reduce((sum, d) => sum + d.value, 0);
                    const percent = total > 0 ? ((percentage / total) * 100).toFixed(1) : 0;
                    return [`${value} min (${percent}%)`, 'Time Spent'];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Enhanced Legend with Percentages */}
          <div className="mt-4 space-y-2 max-h-32 overflow-y-auto">
            {activityTypeData.map((item, index) => {
              const total = activityTypeData.reduce((sum, d) => sum + d.value, 0);
              const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : 0;
              return (
                <div key={index} className="flex items-center justify-between text-sm p-2 rounded hover:bg-gray-50 transition-colors">
                  <div className="flex items-center flex-1">
                    <div 
                      className="w-3 h-3 rounded-full mr-3 flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-gray-700 flex-1">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium text-gray-900">{item.value}m</span>
                    <span className="text-xs text-gray-500 ml-2">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}