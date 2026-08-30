import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, RefreshCcw, Bot, CreditCard, BarChart3,
  ShieldCheck, ScrollText, ChevronLeft, ChevronRight, LogOut,
} from 'lucide-react';
import Logo from '../common/Logo';
import { useAuth } from '../../context/AuthContext';
import { NAV_GROUPS } from '../../data/mockData';

const ICON_MAP = {
  LayoutDashboard, RefreshCcw, Bot, CreditCard,
  BarChart3, ShieldCheck, ScrollText,
};

function NavItem({ item, collapsed }) {
  const Icon = ICON_MAP[item.icon] || LayoutDashboard;

  if (item.disabled) {
    return (
      <div
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-lg
          text-[13px] font-medium cursor-not-allowed opacity-40
          ${collapsed ? 'justify-center' : ''}
        `}
        style={{ color: 'var(--color-text-muted)' }}
        title={collapsed ? `${item.label} (coming soon)` : undefined}
      >
        <Icon size={16} className="flex-shrink-0" />
        {!collapsed && (
          <div className="flex items-center justify-between flex-1 min-w-0">
            <span className="truncate">{item.label}</span>
            <span className="text-[9px] uppercase tracking-wider ml-1 font-semibold opacity-70">Soon</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) => `
        flex items-center gap-3 px-3 py-2.5 rounded-lg
        text-[13px] font-medium transition-all duration-150
        ${collapsed ? 'justify-center' : ''}
        ${isActive
          ? 'bg-[var(--color-bg-active)] text-[var(--color-brand)] font-semibold'
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
        }
      `}
    >
      <Icon size={16} className="flex-shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );
}

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();

  return (
    <aside
      className="sidebar-transition flex flex-col h-full overflow-hidden flex-shrink-0"
      style={{
        width: collapsed ? '64px' : '240px',
        backgroundColor: 'var(--color-bg-sidebar)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      {/* Brand Header */}
      <div
        className="flex items-center px-4 py-4"
        style={{ borderBottom: '1px solid var(--color-border)', minHeight: '64px' }}
      >
        {collapsed ? (
          <Logo variant="icon" size="md" />
        ) : (
          <Logo variant="full" size="md" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-5">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <p
                className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {group.label}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => (
                <NavItem key={item.id} item={item} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User Footer */}
      <div style={{ borderTop: '1px solid var(--color-border)' }}>
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-4 py-3">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: 'var(--color-brand-light)', color: 'var(--color-brand)' }}
            >
              {user.avatarInitials}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                {user.fullName}
              </p>
              <p className="text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>
                {user.businessName}
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-1 px-2 py-2">
          <button
            onClick={logout}
            title="Sign out"
            className="flex items-center gap-2 flex-1 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 cursor-pointer"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--color-danger-bg)';
              e.currentTarget.style.color = 'var(--color-danger)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            <LogOut size={15} className="flex-shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>

          <button
            onClick={onToggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150 cursor-pointer flex-shrink-0"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
