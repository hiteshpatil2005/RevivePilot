import { useEffect, useRef } from 'react';
import { X, CheckCheck, Bell, ShieldCheck, Bot, Settings, ChevronRight } from 'lucide-react';
import { useRealtimeContext } from '../../context/RealtimeContext';
import { notificationApi } from '../../services/notificationApi';

const CATEGORY_ICONS = {
  Recovery: { icon: Bell,        color: 'var(--color-brand)' },
  Policy:   { icon: ShieldCheck, color: 'var(--color-warning)' },
  'AI Agent':{ icon: Bot,        color: 'var(--color-info)' },
  System:   { icon: Settings,    color: 'var(--color-text-muted)' },
};

const SEVERITY_STYLES = {
  success: { dot: 'var(--color-success)', bg: 'var(--color-success-bg)' },
  warning: { dot: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  danger:  { dot: 'var(--color-danger)',  bg: 'var(--color-danger-bg)' },
  info:    { dot: 'var(--color-info)',    bg: 'var(--color-info-bg)' },
};

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * NotificationPanel — slide-down notification drawer.
 *
 * Props:
 *   open    (bool)
 *   onClose (fn)
 */
export default function NotificationPanel({ open, onClose }) {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useRealtimeContext();
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
    notificationApi.markAllAsRead().catch(() => {});
  };

  const handleMarkOneRead = (id) => {
    markNotificationRead(id);
    notificationApi.markAsRead(id).catch(() => {});
  };

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute top-full right-0 mt-2 z-50 animate-fade-in"
      style={{
        width: '400px',
        backgroundColor: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '14px',
        boxShadow: 'var(--shadow-modal)',
        maxHeight: '520px',
        display: 'flex',
        flexDirection: 'column',
      }}
      role="dialog"
      aria-label="Notifications"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-2">
          <Bell size={16} style={{ color: 'var(--color-brand)' }} />
          <h3 className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--color-brand)', color: '#fff' }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-[12px] font-medium cursor-pointer transition-colors"
              style={{ color: 'var(--color-brand)', background: 'none', border: 'none' }}
            >
              <CheckCheck size={13} />
              Mark all read
            </button>
          )}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-7 h-7 rounded-lg transition-colors cursor-pointer"
            style={{ color: 'var(--color-text-muted)', border: 'none', background: 'none' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Notification list */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <Bell size={28} style={{ color: 'var(--color-text-muted)', marginBottom: '12px' }} />
            <p className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>No notifications</p>
            <p className="text-[12px] mt-1" style={{ color: 'var(--color-text-muted)' }}>You're all caught up</p>
          </div>
        ) : (
          notifications.map((notif, idx) => {
            const { icon: CatIcon, color: catColor } = CATEGORY_ICONS[notif.category] || CATEGORY_ICONS.System;
            const sev = SEVERITY_STYLES[notif.severity] || SEVERITY_STYLES.info;

            return (
              <div
                key={notif.id}
                className="flex gap-3 px-5 py-4 cursor-pointer transition-colors"
                style={{
                  borderBottom: idx < notifications.length - 1 ? '1px solid var(--color-border)' : 'none',
                  backgroundColor: notif.read ? 'transparent' : `${sev.bg}66`,
                }}
                onClick={() => handleMarkOneRead(notif.id)}
                onMouseEnter={e => { if (notif.read) e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
                onMouseLeave={e => { if (notif.read) e.currentTarget.style.backgroundColor = ''; }}
              >
                {/* Icon */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `${catColor}20` }}
                >
                  <CatIcon size={14} style={{ color: catColor }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {!notif.read && (
                        <span
                          className="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: sev.dot }}
                        />
                      )}
                      <p className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                        {notif.title}
                      </p>
                    </div>
                    <span className="text-[11px] flex-shrink-0 mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {relativeTime(notif.timestamp)}
                    </span>
                  </div>
                  <p className="text-[12px] mt-0.5 leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                    {notif.message}
                  </p>
                  <span
                    className="inline-block text-[10px] font-semibold uppercase tracking-wider mt-1.5 px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${catColor}20`, color: catColor }}
                  >
                    {notif.category}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div
        className="px-5 py-3"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <p className="text-[12px] text-center" style={{ color: 'var(--color-text-muted)' }}>
          {notifications.length} total notifications
        </p>
      </div>
    </div>
  );
}
