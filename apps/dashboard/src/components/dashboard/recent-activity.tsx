'use client';

import { format } from 'date-fns';
import { Clock, Monitor, Code, Globe, MessageSquare, Palette, Search } from 'lucide-react';

interface ActivityData {
  timestamp: number;
  activity_type: string;
  app_name: string;
  duration_seconds: number;
  project_name?: string;
}

interface RecentActivityProps {
  data: ActivityData[];
}

export function RecentActivity({ data }: RecentActivityProps) {
  const getActivityIcon = (activityType: string, appName: string) => {
    switch (activityType) {
      case 'coding':
        return <Code className="w-4 h-4 text-blue-500" />;
      case 'browsing':
        return <Globe className="w-4 h-4 text-green-500" />;
      case 'communication':
        return <MessageSquare className="w-4 h-4 text-yellow-500" />;
      case 'design':
        return <Palette className="w-4 h-4 text-emerald-500" />;
      case 'research':
        return <Search className="w-4 h-4 text-red-500" />;
      default:
        return <Monitor className="w-4 h-4 text-gray-500" />;
    }
  };

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

  const getRelativeTime = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  const getActivityTypeColor = (activityType: string): string => {
    switch (activityType) {
      case 'coding':
        return 'bg-blue-100 text-blue-800';
      case 'browsing':
        return 'bg-green-100 text-green-800';
      case 'communication':
        return 'bg-yellow-100 text-yellow-800';
      case 'design':
        return 'bg-emerald-100 text-emerald-800';
      case 'research':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
          View All
        </button>
      </div>

      <div className="space-y-3">
        {data.length > 0 ? (
          data.map((activity, index) => (
            <div key={`${activity.timestamp}-${index}`} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex-shrink-0">
                {getActivityIcon(activity.activity_type, activity.app_name)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.app_name}
                  </p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getActivityTypeColor(activity.activity_type)}`}>
                    {activity.activity_type}
                  </span>
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <p className="text-xs text-gray-500">
                    {activity.project_name || 'No project'}
                  </p>
                  <span className="text-gray-300">•</span>
                  <p className="text-xs text-gray-500">
                    {formatDuration(activity.duration_seconds)}
                  </p>
                </div>
              </div>

              <div className="text-right text-xs text-gray-500">
                {getRelativeTime(activity.timestamp)}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No recent activity</p>
            <p className="text-gray-400 text-xs mt-1">Activity will appear here as you work</p>
          </div>
        )}
      </div>

      {data.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">
              Showing {Math.min(data.length, 10)} recent activities
            </span>
            <span className="text-gray-500">
              Last update: {format(new Date(), 'HH:mm')}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}