import { useState, useRef } from 'react';
import { Bell, ChevronDown } from 'lucide-react';
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
        height: '56px',
        borderBottom: '1px solid var(--color-border)',
        backgroundColor: 'var(--color-bg-nav)',
        position: 'relative',
        zIndex: 40,
      }}
    >
      {/* Page title + breadcrumb */}
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-1.5" style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
          <span>RevivePilot</span>
          <span style={{ opacity: 0.4 }}>/</span>
        </div>
        <h1
          style={{ fontSize: '15px', fontWeight: '600', color: 'var(--color-text-primary)', letterSpacing: '-0.01em' }}
        >
          {title}
        </h1>
      </div>

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
            className="relative flex items-center justify-center cursor-pointer transition-all duration-150"
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '6px',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-secondary)',
              backgroundColor: 'transparent',
            }}
            aria-label={`Notifications${unreadCount > 0 ? ` — ${unreadCount} unread` : ''}`}
            aria-expanded={notifOpen}
            onClick={() => { setNotifOpen(p => !p); setProfileOpen(false); }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center font-bold px-1"
                style={{
                  fontSize: '9px',
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

        {/* User avatar + profile menu */}
        {user && (
          <div ref={profileRef} className="relative">
            <button
              id="profile-menu-btn"
              className="flex items-center gap-1.5 cursor-pointer transition-all duration-150"
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
                backgroundColor: 'transparent',
              }}
              aria-label="User profile"
              aria-expanded={profileOpen}
              onClick={() => { setProfileOpen(p => !p); setNotifOpen(false); }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <div
                className="flex items-center justify-center font-bold"
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--color-brand-light)',
                  color: 'var(--color-brand)',
                  fontSize: '11px',
                }}
              >
                {user.avatarInitials}
              </div>
              <ChevronDown size={11} style={{ opacity: 0.5 }} />
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
