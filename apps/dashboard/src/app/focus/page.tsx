'use client';

import { DashboardHeader } from '@/components/dashboard/header';
import { FocusSessionManager } from '@/components/focus';

export default function FocusPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FocusSessionManager />
      </main>
    </div>
  );
}