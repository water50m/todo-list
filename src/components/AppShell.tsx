// components/AppShell.tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
import AppointmentBell from './AppointmentBell';
import Sidebar from './Sidebar';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const canGoBack = pathname !== '/dashboard';
  const isAuthPage = pathname === '/login';

  if (isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="app-main">
        <div className="app-content">
          <div className="app-topbar">
            <button
              className="btn btn-secondary btn-sm app-back-button"
              onClick={() => (canGoBack ? router.back() : router.push('/dashboard'))}
              aria-label="ย้อนกลับ"
            >
              ‹ ย้อนกลับ
            </button>
          </div>
          {children}
        </div>
      </main>
      <AppointmentBell />
    </div>
  );
}
