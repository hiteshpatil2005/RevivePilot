import { useEffect, useRef } from 'react';
import { User, Settings, LogOut, Sun, Moon, ChevronRight, Building2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useThemeContext } from '../../context/ThemeContext';

/**
 * ProfileMenu — user profile dropdown.
 *
 * Props:
 *   open    (bool)
 *   onClose (fn)
 */
export default function ProfileMenu({ open, onClose }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useThemeContext();
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose]);

  if (!open || !user) return null;

  const handleLogout = () => {
    onClose();
    logout();
  };

  const menuItems = [
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      onClick: () => onClose(),
    },
    {
      id: 'settings',
      label: 'Account Settings',
      icon: Settings,
      onClick: () => onClose(),
    },
    {
      id: 'theme',
      label: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      icon: theme === 'dark' ? Sun : Moon,
      onClick: () => { toggleTheme(); onClose(); },
    },
  ];

  return (
    <div
      ref={menuRef}
      className="absolute top-full right-0 mt-2 z-50 animate-fade-in"
      style={{
        width: '240px',
        backgroundColor: 'var(--color-bg-card)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        boxShadow: 'var(--shadow-modal)',
        overflow: 'hidden',
      }}
      role="menu"
      aria-label="User menu"
    >
      {/* User info header */}
      <div
        className="px-4 py-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold flex-shrink-0"
            style={{ backgroundColor: 'var(--color-brand-light)', color: 'var(--color-brand)' }}
          >
            {user.avatarInitials}
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
              {user.fullName}
            </p>
            <p className="text-[12px] truncate" style={{ color: 'var(--color-text-muted)' }}>
              {user.email}
            </p>
          </div>
        </div>
        {/* Business name */}
        <div className="flex items-center gap-1.5 mt-3">
          <Building2 size={12} style={{ color: 'var(--color-text-muted)' }} />
          <p className="text-[12px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
            {user.businessName}
          </p>
          <span
            className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: 'var(--color-brand-light)', color: 'var(--color-brand)' }}
          >
            {user.plan || 'Growth'}
          </span>
        </div>
      </div>

      {/* Menu items */}
      <div className="py-1.5">
        {menuItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              role="menuitem"
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium cursor-pointer transition-colors"
              style={{
                color: 'var(--color-text-secondary)',
                background: 'none',
                border: 'none',
                textAlign: 'left',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = '';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }}
            >
              <Icon size={15} style={{ flexShrink: 0 }} />
              <span className="flex-1">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Logout */}
      <div style={{ borderTop: '1px solid var(--color-border)' }} className="py-1.5">
        <button
          onClick={handleLogout}
          role="menuitem"
          className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium cursor-pointer transition-colors"
          style={{ color: 'var(--color-danger)', background: 'none', border: 'none', textAlign: 'left' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-danger-bg)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}
        >
          <LogOut size={15} style={{ flexShrink: 0 }} />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}
