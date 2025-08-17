import { HealthDashboard } from '@/components/monitoring/health-dashboard';

export default function HealthPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">System Health</h1>
          <p className="mt-2 text-sm text-gray-600">
            Monitor the health and performance of the DevPulse system components.
          </p>
        </div>
        
        <HealthDashboard />
      </div>
    </div>
  );
}