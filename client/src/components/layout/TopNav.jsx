import { Bell } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';
import { useAuth } from '../../context/AuthContext';

/**
 * TopNav — top navigation bar inside the dashboard layout.
 *
 * Props:
 *   title (string) — current page title
 */
export default function TopNav({ title = 'Dashboard' }) {
  const { user } = useAuth();

  return (
    <header
      className="flex items-center justify-between px-6"
      style={{
        height: '64px',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-nav)',
      }}
    >
      {/* Page title */}
      <h1
        className="text-[15px] font-semibold"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {title}
      </h1>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full"
          style={{ backgroundColor: 'var(--color-success-bg)' }}>
          <span
            className="animate-pulse-live inline-block w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: 'var(--color-success)' }}
            aria-hidden="true"
          />
          <span
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-success)' }}
          >
            Live
          </span>
        </div>

        {/* Notifications */}
        <button
          className="relative flex items-center justify-center w-9 h-9 rounded-lg border cursor-pointer transition-all duration-150"
          style={{
            color: 'var(--color-text-secondary)',
            borderColor: 'var(--color-border)',
          }}
          aria-label="Notifications"
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}
        >
          <Bell size={16} />
          {/* Notification badge */}
          <span
            className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full border-2"
            style={{
              backgroundColor: 'var(--color-danger)',
              borderColor: 'var(--color-bg-nav)',
            }}
            aria-label="3 unread notifications"
          />
        </button>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* User avatar */}
        {user && (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold cursor-default ml-1"
            style={{
              backgroundColor: 'var(--color-brand-light)',
              color: 'var(--color-brand)',
            }}
            title={user.fullName}
          >
            {user.avatarInitials}
          </div>
        )}
      </div>
    </header>
  );
}
