import { useState, useRef } from 'react';
import { Bell, ChevronDown } from 'lucide-react';
import ThemeToggle from '../common/ThemeToggle';
import RealtimeStatus from '../common/RealtimeStatus';
import ApiStatus from '../common/ApiStatus';
import NotificationPanel from './NotificationPanel';
import ProfileMenu from './ProfileMenu';
import { useAuth } from '../../context/AuthContext';
import { useRealtimeContext } from '../../context/RealtimeContext';

/**
 * TopNav — top navigation bar inside the dashboard layout.
 *
 * Props:
 *   title (string) — current page title
 */
export default function TopNav({ title = 'Dashboard' }) {
  const { user } = useAuth();
  const { unreadCount, connectionStatus } = useRealtimeContext();
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  return (
    <header
      className="flex items-center justify-between px-6"
      style={{
        height: '64px',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-nav)',
        position: 'relative',
        zIndex: 40,
      }}
    >
      {/* Page title */}
      <h1
        className="text-[16px] font-semibold"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {title}
      </h1>

      {/* Right controls */}
      <div className="flex items-center gap-2">
        {/* API Backend status */}
        <ApiStatus />

        {/* Realtime WebSocket status */}
        <RealtimeStatus status={connectionStatus} />

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            id="notifications-btn"
            className="relative flex items-center justify-center w-9 h-9 rounded-lg border cursor-pointer transition-all duration-150"
            style={{
              color: 'var(--color-text-secondary)',
              borderColor: 'var(--color-border)',
            }}
            aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ''}`}
            aria-expanded={notifOpen}
            onClick={() => { setNotifOpen(p => !p); setProfileOpen(false); }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}
          >
            <Bell size={16} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold px-1"
                style={{
                  backgroundColor: 'var(--color-danger)',
                  color: '#fff',
                  border: '2px solid var(--color-bg-nav)',
                }}
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <NotificationPanel
            open={notifOpen}
            onClose={() => setNotifOpen(false)}
          />
        </div>

        {/* Theme toggle */}
        <ThemeToggle />

        {/* User avatar + profile menu */}
        {user && (
          <div ref={profileRef} className="relative">
            <button
              id="profile-menu-btn"
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border cursor-pointer transition-all duration-150 ml-1"
              style={{
                color: 'var(--color-text-secondary)',
                borderColor: 'var(--color-border)',
              }}
              aria-label="User profile"
              aria-expanded={profileOpen}
              onClick={() => { setProfileOpen(p => !p); setNotifOpen(false); }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold"
                style={{
                  backgroundColor: 'var(--color-brand-light)',
                  color: 'var(--color-brand)',
                }}
              >
                {user.avatarInitials}
              </div>
              <ChevronDown size={12} style={{ opacity: 0.6 }} />
            </button>

            <ProfileMenu
              open={profileOpen}
              onClose={() => setProfileOpen(false)}
            />
          </div>
        )}
      </div>
    </header>
  );
}
