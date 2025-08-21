'use client';

import { DashboardHeader } from '@/components/dashboard/header';

export default function GitHubPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <DashboardHeader />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Page Header */}
          <div className="border-b border-gray-200 pb-5">
            <h1 className="text-2xl font-bold text-primary">GitHub Integration</h1>
            <p className="mt-2 text-sm text-secondary">
              Connect your GitHub account to track commits, pull requests, and repository activity alongside your development metrics.
            </p>
          </div>

          {/* Coming Soon Notice */}
          <div className="card p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 2C5.58 2 2 5.58 2 10c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0018 10c0-4.42-3.58-8-8-8z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-primary mb-2">GitHub Integration</h3>
            <p className="text-secondary mb-6 max-w-md mx-auto">
              This feature is currently in development. Soon you'll be able to connect your GitHub account to correlate your coding activity with commits and pull requests.
            </p>
            
            {/* Feature Preview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-primary mb-2">📊 Commit Analytics</h4>
                <p className="text-sm text-tertiary">Track commits per day, repository activity, and coding patterns</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-primary mb-2">🔄 Pull Request Tracking</h4>
                <p className="text-sm text-tertiary">Monitor PR reviews, merge rates, and collaboration metrics</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-primary mb-2">📈 Repository Insights</h4>
                <p className="text-sm text-tertiary">Analyze repository contributions and project activity</p>
              </div>
            </div>
          </div>

          {/* Benefits Section */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold text-primary mb-4">Why Connect GitHub?</h3>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-secondary">Correlate Activity with Output</p>
                  <p className="text-sm text-tertiary">See how your focused work time translates to actual code contributions</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-secondary">Track Project Progress</p>
                  <p className="text-sm text-tertiary">Monitor development velocity across different repositories</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mt-2"></div>
                <div>
                  <p className="font-medium text-secondary">Privacy-First Integration</p>
                  <p className="text-sm text-tertiary">All data stays local - we only track metrics, not code content</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}