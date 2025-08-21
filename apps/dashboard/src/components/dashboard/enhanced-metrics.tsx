'use client';

import { useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  RadialBarChart, 
  RadialBar, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts/es6';
import { TrendingUp, Target, Clock, Zap, Activity, Award, Calendar, BarChart3 } from 'lucide-react';
import { format, subDays, isToday, isYesterday, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

interface ActivityData {
  timestamp: number;
  activity_type: string;
  app_name: string;
  duration_seconds: number;
  project_name?: string;
}

interface EnhancedMetricsProps {
  data: ActivityData[];
  focusGoal?: number; // Daily focus goal in minutes
}

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label: string;
  };
  progress?: {
    value: number;
    max: number;
    color: string;
  };
  color: string;
  size?: 'small' | 'large';
}

function MetricCard({ icon, title, value, subtitle, trend, progress, color, size = 'small' }: MetricCardProps) {
  const cardClasses = size === 'large' 
    ? "card p-6"
    : "card p-5";

  const getTrendIcon = () => {
    if (!trend) return null;
    if (trend.direction === 'up') return <TrendingUp className="w-3 h-3 text-green-500" />;
    if (trend.direction === 'down') return <TrendingUp className="w-3 h-3 text-red-500 rotate-180" />;
    return <div className="w-3 h-3 bg-gray-300 rounded-full" />;
  };

  const getTrendColor = () => {
    if (!trend) return '';
    if (trend.direction === 'up') return 'text-green-600';
    if (trend.direction === 'down') return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className={cardClasses}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium mb-2 text-secondary">{title}</p>
          <p className={`${size === 'large' ? 'text-3xl' : 'text-2xl'} font-semibold mb-1 text-primary`}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs mb-2 text-tertiary">{subtitle}</p>
          )}
          
          {/* Progress Bar */}
          {progress && (
            <div className="w-full bg-gray-100 rounded-full h-1.5 mb-2">
              <div 
                className={`h-1.5 rounded-full transition-all duration-300 ${progress.color}`}
                style={{ width: `${Math.min((progress.value / progress.max) * 100, 100)}%` }}
              />
            </div>
          )}
          
          {/* Trend Indicator */}
          {trend && (
            <div className={`flex items-center space-x-1 text-xs ${getTrendColor()}`}>
              {getTrendIcon()}
              <span>{trend.value > 0 ? '+' : ''}{trend.value}% {trend.label}</span>
            </div>
          )}
        </div>
        
        <div className={`${color} p-2.5 rounded-md text-white flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

export function EnhancedMetrics({ data, focusGoal = 240 }: EnhancedMetricsProps) {
  const metrics = useMemo(() => {
    const today = new Date();
    // const yesterday = subDays(today, 1);
    
    // Use all data since it's already filtered by the API server for the selected date
    const todayData = data;
    const yesterdayData: ActivityData[] = []; // No yesterday data available since API only returns selected date
    
    // Weekly data for trends
    const weekData = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const dayActivities = data.filter(activity =>
        isWithinInterval(new Date(activity.timestamp), { start: dayStart, end: dayEnd })
      );
      
      const focusActivities = dayActivities.filter(a => 
        ['code', 'build', 'test', 'debug'].includes(a.activity_type)
      );
      
      weekData.push({
        date: format(date, 'EEE'),
        total: Math.round(dayActivities.reduce((sum, a) => sum + (a.duration_seconds / 60), 0)),
        focus: Math.round(focusActivities.reduce((sum, a) => sum + (a.duration_seconds / 60), 0)),
        productivity: Math.round((focusActivities.reduce((sum, a) => sum + (a.duration_seconds / 60), 0) / Math.max(1, dayActivities.reduce((sum, a) => sum + (a.duration_seconds / 60), 0))) * 100)
      });
    }
    
    // Calculate metrics
    const todayMinutes = todayData.reduce((sum, a) => sum + (a.duration_seconds / 60), 0);
    const yesterdayMinutes = yesterdayData.reduce((sum, a) => sum + (a.duration_seconds / 60), 0);
    const timeChange = yesterdayMinutes > 0 ? ((todayMinutes - yesterdayMinutes) / yesterdayMinutes) * 100 : 0;
    
    const todayFocus = todayData.filter(a => ['code', 'build', 'test', 'debug'].includes(a.activity_type))
      .reduce((sum, a) => sum + (a.duration_seconds / 60), 0);
    const yesterdayFocus = yesterdayData.filter(a => ['code', 'build', 'test', 'debug'].includes(a.activity_type))
      .reduce((sum, a) => sum + (a.duration_seconds / 60), 0);
    const focusChange = yesterdayFocus > 0 ? ((todayFocus - yesterdayFocus) / yesterdayFocus) * 100 : 0;
    
    const todayActivities = todayData.length;
    const yesterdayActivities = yesterdayData.length;
    const activityChange = yesterdayActivities > 0 ? ((todayActivities - yesterdayActivities) / yesterdayActivities) * 100 : 0;
    
    const productivityScore = todayMinutes > 0 ? Math.round((todayFocus / todayMinutes) * 100) : 0;
    const avgWeeklyProductivity = weekData.length > 0 ? weekData.reduce((sum, d) => sum + d.productivity, 0) / weekData.length : 0;
    const productivityChange = avgWeeklyProductivity > 0 ? ((productivityScore - avgWeeklyProductivity) / avgWeeklyProductivity) * 100 : 0;
    
    // App distribution for radial chart
    const appBreakdown = todayData.reduce((acc, activity) => {
      acc[activity.app_name] = (acc[activity.app_name] || 0) + (activity.duration_seconds / 60);
      return acc;
    }, {} as Record<string, number>);
    
    const topApps = Object.entries(appBreakdown)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([app, minutes], index) => ({
        name: app,
        value: Math.round(minutes),
        fill: ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#a855f7'][index]
      }));
    
    return {
      totalTime: Math.round(todayMinutes),
      focusTime: Math.round(todayFocus),
      activities: todayActivities,
      productivityScore,
      trends: {
        time: { value: Math.round(timeChange), direction: timeChange > 0 ? 'up' : timeChange < 0 ? 'down' : 'neutral' as const },
        focus: { value: Math.round(focusChange), direction: focusChange > 0 ? 'up' : focusChange < 0 ? 'down' : 'neutral' as const },
        activities: { value: Math.round(activityChange), direction: activityChange > 0 ? 'up' : activityChange < 0 ? 'down' : 'neutral' as const },
        productivity: { value: Math.round(productivityChange), direction: productivityChange > 0 ? 'up' : productivityChange < 0 ? 'down' : 'neutral' as const }
      },
      weekData,
      topApps,
      focusGoal
    };
  }, [data, focusGoal]);

  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Main Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          icon={<Clock className="w-5 h-5" />}
          title="Total Active Time"
          value={formatTime(metrics.totalTime)}
          subtitle="Today&apos;s total activity"
          trend={{
            value: metrics.trends.time.value,
            direction: metrics.trends.time.direction,
            label: 'vs yesterday'
          }}
          color="bg-blue-600"
        />
        
        <MetricCard
          icon={<Zap className="w-5 h-5" />}
          title="Deep Focus Time"
          value={formatTime(metrics.focusTime)}
          subtitle={`Goal: ${formatTime(metrics.focusGoal)}`}
          trend={{
            value: metrics.trends.focus.value,
            direction: metrics.trends.focus.direction,
            label: 'vs yesterday'
          }}
          progress={{
            value: metrics.focusTime,
            max: metrics.focusGoal,
            color: 'bg-green-600'
          }}
          color="bg-green-600"
        />
        
        <MetricCard
          icon={<Activity className="w-5 h-5" />}
          title="Activities"
          value={metrics.activities}
          subtitle="Recorded today"
          trend={{
            value: metrics.trends.activities.value,
            direction: metrics.trends.activities.direction,
            label: 'vs yesterday'
          }}
          color="bg-blue-600"
        />
        
        <MetricCard
          icon={<Target className="w-5 h-5" />}
          title="Productivity Score"
          value={`${metrics.productivityScore}%`}
          subtitle="Focus vs total time"
          trend={{
            value: metrics.trends.productivity.value,
            direction: metrics.trends.productivity.direction,
            label: 'vs weekly avg'
          }}
          color="bg-orange-600"
        />
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-primary">Weekly Trends</h3>
            <BarChart3 className="w-5 h-5 text-tertiary" />
          </div>
          
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics.weekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                <YAxis stroke="#6b7280" fontSize={12} />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    color: '#374151',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(value, name) => {
                    if (name === 'total') return [`${value} min`, 'Total Time'];
                    if (name === 'focus') return [`${value} min`, 'Focus Time'];
                    if (name === 'productivity') return [`${value}%`, 'Productivity'];
                    return [value, name];
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', r: 3 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="focus" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  dot={{ fill: '#22c55e', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          <div className="flex items-center justify-center space-x-6 mt-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-600 rounded-full mr-2"></div>
              <span className="text-secondary">Total Time</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-600 rounded-full mr-2"></div>
              <span className="text-secondary">Focus Time</span>
            </div>
          </div>
        </div>

        {/* Focus Goal Progress */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-primary">Focus Goal Progress</h3>
            <Award className="w-5 h-5 text-tertiary" />
          </div>
          
          <div className="flex items-center justify-center h-48">
            <ResponsiveContainer width="100%" height="100%">
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="60%"
                outerRadius="90%"
                data={[{
                  name: 'Focus Progress',
                  value: Math.min((metrics.focusTime / metrics.focusGoal) * 100, 100),
                  fill: metrics.focusTime >= metrics.focusGoal ? '#22c55e' : '#3b82f6'
                }]}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar
                  dataKey="value"
                  cornerRadius={8}
                  fill={(metrics.focusTime / metrics.focusGoal) >= 1 ? '#22c55e' : '#3b82f6'}
                />
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  className="fill-current text-primary"
                >
                  <tspan x="50%" dy="-0.5em" fontSize="20" fontWeight="600">
                    {Math.round((metrics.focusTime / metrics.focusGoal) * 100)}%
                  </tspan>
                  <tspan x="50%" dy="1.5em" fontSize="11" className="fill-current text-tertiary">
                    {formatTime(metrics.focusTime)} / {formatTime(metrics.focusGoal)}
                  </tspan>
                </text>
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-secondary">
              {metrics.focusTime >= metrics.focusGoal 
                ? `Goal achieved! ${formatTime(metrics.focusTime - metrics.focusGoal)} bonus time`
                : `${formatTime(metrics.focusGoal - metrics.focusTime)} remaining to reach goal`
              }
            </p>
          </div>
        </div>
      </div>

      {/* Top Applications */}
      {metrics.topApps.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-primary">Top Applications Today</h3>
            <Calendar className="w-5 h-5 text-tertiary" />
          </div>
          
          <div className="flex items-center space-x-8">
            <div className="h-32 w-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.topApps}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {metrics.topApps.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} min`, 'Time']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      color: '#374151',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex-1 space-y-3">
              {metrics.topApps.map((app, index) => (
                <div key={app.name} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: app.fill }}
                    />
                    <span className="text-sm font-medium text-primary">{app.name}</span>
                  </div>
                  <span className="text-sm text-secondary">{formatTime(app.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}