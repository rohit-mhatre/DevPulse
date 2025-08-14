'use client';

import { useMemo } from 'react';
import { FolderOpen, Clock, TrendingUp, Calendar } from 'lucide-react';
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

  const getProjectColor = (index: number): string => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-indigo-500'
    ];
    return colors[index % colors.length];
  };

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

      <div className="space-y-4">
        {projectStats.length > 0 ? (
          projectStats.map((project, index) => (
            <div key={project.name} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-3 flex-1">
                <div className={`w-3 h-3 rounded-full ${getProjectColor(index)}`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {project.name}
                  </p>
                  <div className="flex items-center space-x-4 mt-1">
                    <span className="text-xs text-gray-500 flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDuration(project.totalTime)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {project.activities} activities
                    </span>
                    <span className="text-xs text-gray-500">
                      {getRelativeTime(project.lastActivity)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right ml-4">
                <p className="text-sm font-medium text-gray-900">
                  {project.percentage.toFixed(1)}%
                </p>
                <div className="w-16 h-2 bg-gray-200 rounded-full mt-1">
                  <div 
                    className={`h-full rounded-full ${getProjectColor(index)}`}
                    style={{ width: `${Math.min(project.percentage, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No project activity today</p>
            <p className="text-gray-400 text-xs mt-1">Start working on projects to see breakdown</p>
          </div>
        )}
      </div>

      {projectStats.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {projectStats.length}
              </p>
              <p className="text-xs text-gray-500">Active Projects</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">
                {formatDuration(projectStats.reduce((sum, p) => sum + p.totalTime, 0))}
              </p>
              <p className="text-xs text-gray-500">Total Time</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}