'use client';

import { useMemo } from 'react';
import { format, subDays, isWithinInterval, startOfDay, endOfDay, startOfWeek, addDays } from 'date-fns';
import { Calendar, TrendingUp, Clock, Zap } from 'lucide-react';

interface ActivityData {
  timestamp: number;
  activity_type: string;
  app_name: string;
  duration_seconds: number;
  project_name?: string;
}

interface ProductivityHeatmapProps {
  data: ActivityData[];
}

interface HeatmapCell {
  date: Date;
  value: number;
  intensity: number;
  activities: number;
  focusTime: number;
  dayName: string;
  formattedDate: string;
}

export function ProductivityHeatmap({ data }: ProductivityHeatmapProps) {
  const heatmapData = useMemo(() => {
    const weeks: HeatmapCell[][] = [];
    const now = new Date();
    const startDate = subDays(now, 83); // 12 weeks back
    
    // Generate 12 weeks of data
    for (let week = 0; week < 12; week++) {
      const weekStart = addDays(startOfWeek(startDate), week * 7);
      const weekData: HeatmapCell[] = [];
      
      for (let day = 0; day < 7; day++) {
        const currentDate = addDays(weekStart, day);
        const dayStart = startOfDay(currentDate);
        const dayEnd = endOfDay(currentDate);
        
        const dayActivities = data.filter(activity =>
          isWithinInterval(new Date(activity.timestamp), { start: dayStart, end: dayEnd })
        );
        
        const totalMinutes = dayActivities.reduce((sum, activity) =>
          sum + (activity.duration_seconds / 60), 0
        );
        
        const focusActivities = dayActivities.filter(a => 
          ['code', 'build', 'test', 'debug'].includes(a.activity_type)
        );
        const focusTime = focusActivities.reduce((sum, activity) =>
          sum + (activity.duration_seconds / 60), 0
        );
        
        // Calculate intensity (0-4) based on total activity
        let intensity = 0;
        if (totalMinutes > 0) {
          intensity = 1;
          if (totalMinutes > 60) intensity = 2;
          if (totalMinutes > 180) intensity = 3;
          if (totalMinutes > 300) intensity = 4;
        }
        
        weekData.push({
          date: currentDate,
          value: totalMinutes,
          intensity,
          activities: dayActivities.length,
          focusTime,
          dayName: format(currentDate, 'EEE'),
          formattedDate: format(currentDate, 'MMM dd, yyyy')
        });
      }
      
      weeks.push(weekData);
    }
    
    return weeks;
  }, [data]);

  const getIntensityColor = (intensity: number): string => {
    const colors = [
      'bg-gray-100', // 0 - no activity
      'bg-indigo-200', // 1 - light activity
      'bg-indigo-400', // 2 - moderate activity
      'bg-indigo-600', // 3 - high activity
      'bg-indigo-800'  // 4 - very high activity
    ];
    return colors[intensity] || colors[0];
  };

  const getIntensityLabel = (intensity: number): string => {
    const labels = ['No activity', 'Light', 'Moderate', 'High', 'Very high'];
    return labels[intensity] || labels[0];
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const flatData = heatmapData.flat();
    const activeDays = flatData.filter(cell => cell.value > 0).length;
    const totalActivity = flatData.reduce((sum, cell) => sum + cell.value, 0);
    const averageDaily = activeDays > 0 ? totalActivity / activeDays : 0;
    const bestDay = flatData.reduce((best, cell) => 
      cell.value > best.value ? cell : best, flatData[0] || { value: 0, formattedDate: '', focusTime: 0 }
    );
    const totalFocus = flatData.reduce((sum, cell) => sum + cell.focusTime, 0);
    
    return {
      activeDays,
      totalHours: Math.round(totalActivity / 60),
      averageDaily: Math.round(averageDaily),
      bestDay: {
        ...bestDay,
        value: Math.round(bestDay.value)
      },
      totalFocusHours: Math.round(totalFocus / 60),
      focusPercentage: totalActivity > 0 ? Math.round((totalFocus / totalActivity) * 100) : 0
    };
  }, [heatmapData]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Activity Heatmap</h3>
        </div>
        <span className="text-sm text-gray-500">Last 12 weeks</span>
      </div>

      {/* Heatmap Grid */}
      <div className="mb-6">
        <div className="flex">
          {/* Day labels */}
          <div className="flex flex-col justify-between h-32 mr-3 text-xs text-gray-500">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>
          
          {/* Heatmap cells */}
          <div className="flex space-x-1">
            {heatmapData.map((week, weekIndex) => (
              <div key={weekIndex} className="flex flex-col space-y-1">
                {week.map((cell, dayIndex) => (
                  <div
                    key={dayIndex}
                    className={`w-3 h-3 rounded-sm ${getIntensityColor(cell.intensity)} cursor-pointer hover:ring-2 hover:ring-indigo-300 transition-all group relative`}
                    title={`${cell.formattedDate}: ${Math.round(cell.value)} min activity, ${Math.round(cell.focusTime)} min focus time`}
                  >
                    {/* Tooltip */}
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap pointer-events-none">
                      <div className="font-medium">{cell.formattedDate}</div>
                      <div>{Math.round(cell.value)} min total</div>
                      <div>{Math.round(cell.focusTime)} min focus</div>
                      <div>{cell.activities} activities</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        
        {/* Intensity scale */}
        <div className="flex items-center justify-between mt-4">
          <span className="text-xs text-gray-500">Less</span>
          <div className="flex space-x-1">
            {[0, 1, 2, 3, 4].map(intensity => (
              <div
                key={intensity}
                className={`w-3 h-3 rounded-sm ${getIntensityColor(intensity)}`}
                title={getIntensityLabel(intensity)}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">More</span>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Calendar className="w-4 h-4 text-gray-500 mr-1" />
          </div>
          <p className="text-lg font-bold text-gray-900">{stats.activeDays}</p>
          <p className="text-xs text-gray-500">Active Days</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Clock className="w-4 h-4 text-gray-500 mr-1" />
          </div>
          <p className="text-lg font-bold text-indigo-600">{stats.totalHours}h</p>
          <p className="text-xs text-gray-500">Total Hours</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <Zap className="w-4 h-4 text-gray-500 mr-1" />
          </div>
          <p className="text-lg font-bold text-green-600">{stats.totalFocusHours}h</p>
          <p className="text-xs text-gray-500">Focus Time</p>
        </div>
        
        <div className="text-center">
          <div className="flex items-center justify-center mb-1">
            <TrendingUp className="w-4 h-4 text-gray-500 mr-1" />
          </div>
          <p className="text-lg font-bold text-orange-600">{stats.averageDaily}m</p>
          <p className="text-xs text-gray-500">Daily Avg</p>
        </div>
      </div>
      
      {/* Best day highlight */}
      {stats.bestDay.value > 0 && (
        <div className="mt-4 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg border border-indigo-100">
          <div className="flex items-center space-x-2 text-sm">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
            <span className="text-gray-700">
              Best day: <span className="font-medium text-indigo-600">{stats.bestDay.formattedDate}</span> with {stats.bestDay.value} minutes
            </span>
          </div>
        </div>
      )}
    </div>
  );
}