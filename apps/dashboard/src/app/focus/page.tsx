'use client';

import { DashboardHeader } from '@/components/dashboard/header';
import { FocusSessionManager } from '@/components/focus';

export default function FocusPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--background)' }}>
      <DashboardHeader />
      
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <FocusSessionManager />
      </main>
    </div>
  );
}