'use client';

import { DashboardHeader } from '@/components/dashboard/header';
import { FocusSessionManager } from '@/components/focus/focus-session-manager';

export default function FocusPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      <DashboardHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <FocusSessionManager />
      </main>
    </div>
  );
}