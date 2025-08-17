'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { FolderOpen, Clock, BarChart3 } from 'lucide-react';
import { isToday } from 'date-fns';

interface ActivityData {
  timestamp: number;
  activity_type: string;
  app_name: string;
  duration_seconds: number;
  project_name?: string;
}

interface ProjectBreakdownProps {
  data: ActivityData[];
}

export function ProjectBreakdown({ data }: ProjectBreakdownProps) {
  const projectStats = useMemo(() => {
    const todayData = data.filter(activity => isToday(new Date(activity.timestamp)));
    const projectMap: Record<string, {
      name: string;
      totalTime: number;
      activities: number;
      lastActivity: number;
      percentage: number;
    }> = {};

    const totalTime = todayData.reduce((sum, activity) => sum + activity.duration_seconds, 0);

    todayData.forEach(activity => {
      const projectName = activity.project_name || 'Other';
      
      if (!projectMap[projectName]) {
        projectMap[projectName] = {
          name: projectName,
          totalTime: 0,
          activities: 0,
          lastActivity: activity.timestamp,
          percentage: 0
        };
      }

      projectMap[projectName].totalTime += activity.duration_seconds;
      projectMap[projectName].activities += 1;
      projectMap[projectName].lastActivity = Math.max(
        projectMap[projectName].lastActivity,
        activity.timestamp
      );
    });

    // Calculate percentages and sort by time
    Object.values(projectMap).forEach(project => {
      project.percentage = totalTime > 0 ? (project.totalTime / totalTime) * 100 : 0;
    });

    return Object.values(projectMap)
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 6); // Top 6 projects
  }, [data]);

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${seconds}s`;
    }
  };

  // const getProjectColor = (index: number): string => {
  //   const colors = [
  //     'bg-indigo-500',
  //     'bg-green-500',
  //     'bg-yellow-500', 
  //     'bg-red-500',
  //     'bg-purple-500',
  //     'bg-pink-500'
  //   ];
  //   return colors[index % colors.length];
  // };

  const getRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <FolderOpen className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Project Breakdown</h3>
        </div>
        <span className="text-sm text-gray-500">Today</span>
      </div>

      {projectStats.length > 0 ? (
        <div className="space-y-6">
          {/* Mini Pie Chart */}
          <div className="flex items-center justify-center">
            <div className="h-32 w-32">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectStats.map((project, index) => ({
                      name: project.name,
                      value: project.totalTime,
                      fill: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][index] || '#6b7280'
                    }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={50}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {projectStats.map((entry, index) => {
                      const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
                      return <Cell key={`cell-${index}`} fill={colors[index] || '#6b7280'} />;
                    })}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${formatDuration(value as number)}`, 'Time']}
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      border: 'none',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          {/* Enhanced Project List */}
          <div className="space-y-3">
            {projectStats.map((project, index) => {
              const colors = ['bg-indigo-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500', 'bg-purple-500', 'bg-pink-500'];
              const bgColors = ['bg-indigo-50', 'bg-green-50', 'bg-yellow-50', 'bg-red-50', 'bg-purple-50', 'bg-pink-50'];
              const textColors = ['text-indigo-700', 'text-green-700', 'text-yellow-700', 'text-red-700', 'text-purple-700', 'text-pink-700'];
              
              return (
                <div key={project.name} className={`p-4 rounded-lg ${bgColors[index] || 'bg-gray-50'} border border-opacity-20 hover:shadow-md transition-all`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-4 h-4 rounded-full ${colors[index] || 'bg-gray-500'}`}></div>
                      <h4 className={`font-semibold ${textColors[index] || 'text-gray-700'} truncate`}>
                        {project.name}
                      </h4>
                    </div>
                    <span className={`text-sm font-bold ${textColors[index] || 'text-gray-700'}`}>
                      {project.percentage.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    {/* Progress bar */}
                    <div className="w-full bg-white bg-opacity-50 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${colors[index] || 'bg-gray-500'}`}
                        style={{ width: `${Math.min(project.percentage, 100)}%` }}
                      ></div>
                    </div>
                    
                    {/* Project stats */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-4">
                        <span className={`flex items-center ${textColors[index] || 'text-gray-600'}`}>
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDuration(project.totalTime)}
                        </span>
                        <span className={textColors[index] || 'text-gray-600'}>
                          {project.activities} activities
                        </span>
                      </div>
                      <span className={textColors[index] || 'text-gray-600'}>
                        {getRelativeTime(project.lastActivity)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No project activity today</p>
          <p className="text-gray-400 text-xs mt-1">Start working on projects to see breakdown</p>
        </div>
      )}

      {projectStats.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100">
              <div className="flex items-center justify-center mb-1">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
              </div>
              <p className="text-lg font-bold text-indigo-700">
                {projectStats.length}
              </p>
              <p className="text-xs text-indigo-600 font-medium">Active Projects</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100">
              <div className="flex items-center justify-center mb-1">
                <Clock className="w-4 h-4 text-green-600" />
              </div>
              <p className="text-lg font-bold text-green-700">
                {formatDuration(projectStats.reduce((sum, p) => sum + p.totalTime, 0))}
              </p>
              <p className="text-xs text-green-600 font-medium">Total Time</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}