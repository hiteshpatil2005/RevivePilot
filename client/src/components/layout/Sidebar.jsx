import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, RefreshCcw, Bot, CreditCard, BarChart3,
  ShieldCheck, ScrollText, ChevronLeft, ChevronRight, LogOut,
  FlaskConical,
} from 'lucide-react';
import Logo from '../common/Logo';
import { useAuth } from '../../context/AuthContext';
import { NAV_GROUPS } from '../../data/mockData';

const ICON_MAP = {
  LayoutDashboard, RefreshCcw, Bot, CreditCard,
  BarChart3, ShieldCheck, ScrollText, FlaskConical,
};

function NavItem({ item, collapsed }) {
  const Icon = ICON_MAP[item.icon] || LayoutDashboard;

  return (
    <NavLink
      to={item.path}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) => `
        flex items-center gap-2.5 px-3 py-2 rounded-md
        text-[13px] font-medium transition-all duration-150
        ${collapsed ? 'justify-center' : ''}
        ${isActive
          ? 'bg-[var(--color-brand-light)] text-[var(--color-brand)]'
          : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]'
        }
      `}
    >
      <Icon size={15} className="flex-shrink-0" />
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
        width: collapsed ? '56px' : '224px',
        backgroundColor: 'var(--color-bg-sidebar)',
        borderRight: '1px solid var(--color-border)',
      }}
    >
      {/* Brand Header */}
      <div
        className="flex items-center px-3 py-3"
        style={{ borderBottom: '1px solid var(--color-border)', minHeight: '56px' }}
      >
        {collapsed ? (
          <Logo variant="icon" size="sm" />
        ) : (
          <Logo variant="full" size="sm" />
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <p
                className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest"
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

        {/* Customer Portal Link */}
        <div>
          {!collapsed && (
            <p
              className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'var(--color-text-muted)' }}
            >
              Customer Apps
            </p>
          )}
          <a
            href="http://localhost:3001"
            target="_blank"
            rel="noreferrer"
            title={collapsed ? 'Customer Store' : undefined}
            className={`
              flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150
              ${collapsed ? 'justify-center' : ''}
              hover:bg-[var(--color-bg-hover)]
            `}
            style={{ color: 'var(--color-text-secondary)' }}
          >
            <CreditCard size={15} className="flex-shrink-0" style={{ color: 'var(--color-brand)' }} />
            {!collapsed && (
              <div className="flex items-center justify-between flex-1 truncate">
                <span className="truncate">Customer Store</span>
                <span style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>↗</span>
              </div>
            )}
          </a>
        </div>
      </nav>

      {/* User Footer */}
      <div style={{ borderTop: '1px solid var(--color-border)' }}>
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-3 py-3">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0"
              style={{ backgroundColor: 'var(--color-brand-light)', color: 'var(--color-brand)' }}
            >
              {user.avatarInitials}
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--color-text-primary)' }}>
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
            className="flex items-center gap-2 flex-1 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150 cursor-pointer"
            style={{ color: 'var(--color-text-secondary)', backgroundColor: 'transparent' }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--color-danger-bg)';
              e.currentTarget.style.color = 'var(--color-danger)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
          >
            <LogOut size={14} className="flex-shrink-0" />
            {!collapsed && <span>Sign out</span>}
          </button>

          <button
            onClick={onToggle}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex items-center justify-center w-7 h-7 rounded-md transition-all duration-150 cursor-pointer flex-shrink-0"
            style={{ color: 'var(--color-text-muted)', backgroundColor: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>
      </div>
    </aside>
  );
}
