// components/Sidebar.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Appointment } from '@/types';

const NAV = [
  { href: '/dashboard', icon: '◇', label: 'Dashboard' },
  { href: '/tasks',     icon: '☰', label: 'Tasks' },
  { href: '/daily',     icon: '☼', label: 'Daily' },
  { href: '/calendar',  icon: '□', label: 'Calendar' },
  { href: '/settings',  icon: '⚙', label: 'Settings' },
];

function dateKey(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysUntil(iso: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export default function Sidebar() {
  const path = usePathname();
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  useEffect(() => {
    const today = new Date();
    const from = dateKey(today);
    const to = dateKey(addDays(today, 7));

    fetch(`/api/appointments?from=${from}&to=${to}`)
      .then(res => res.json())
      .then(data => {
        const rows: Appointment[] = data.data || [];
        setAppointments(rows.filter(item => item.status !== 'cancelled').slice(0, 4));
      })
      .catch(() => setAppointments([]));
  }, []);

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-brand">
          <div className="sidebar-mark">T</div>
          <span className="sidebar-title">
            TodoApp
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV.map(({ href, icon, label }) => {
          const active = path === href || path.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`sidebar-link${active ? ' active' : ''}`}
            >
              <span className="sidebar-icon">{icon}</span>
              <span className="sidebar-label">{label}</span>
            </Link>
          );
        })}
      </nav>

      {appointments.length > 0 && (
        <div className="sidebar-alerts">
          <div className="sidebar-alerts-title">นัดหมายใน 7 วัน</div>
          <div className="sidebar-alerts-list">
            {appointments.map(item => {
              const diff = daysUntil(item.start_at);
              return (
                <Link key={item.id} href="/calendar" className="sidebar-alert">
                  <span className="sidebar-alert-dot" />
                  <span className="sidebar-alert-main">
                    <span className="sidebar-alert-name">{item.title}</span>
                    <span className="sidebar-alert-meta">
                      {diff === 0 ? 'วันนี้' : diff === 1 ? 'พรุ่งนี้' : `อีก ${diff} วัน`}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">D</div>
          <div className="sidebar-user-meta">
            <div className="sidebar-user-name">Demo User</div>
            <div className="sidebar-user-email">demo@example.com</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
