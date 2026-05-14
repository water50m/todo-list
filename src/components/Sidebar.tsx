// components/Sidebar.tsx
'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/dashboard', icon: '◇', label: 'Dashboard' },
  { href: '/tasks',     icon: '☰', label: 'Tasks' },
  { href: '/daily',     icon: '☼', label: 'Daily' },
  { href: '/calendar',  icon: '□', label: 'Calendar' },
  { href: '/settings',  icon: '⚙', label: 'Settings' },
];

export default function Sidebar() {
  const path = usePathname();

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
