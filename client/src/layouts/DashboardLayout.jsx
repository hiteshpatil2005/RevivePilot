import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import TopNav from '../components/layout/TopNav';

/** Maps route paths to human-readable page titles */
const PAGE_TITLES = {
  '/dashboard':    'Dashboard',
  '/recovery':     'Recovery Cases',
  '/agents':       'AI Agents',
  '/transactions': 'Transactions',
  '/analytics':    'Analytics',
  '/policies':     'Policies',
  '/audit':        'Audit Logs',
};

/**
 * DashboardLayout
 *
 * Structure:
 *   ┌─ Sidebar ─┬─── Main ──────────────────────┐
 *   │           │  TopNav                        │
 *   │   Nav     ├──────────────────────────────  │
 *   │           │  <Outlet /> (page content)     │
 *   └───────────┴───────────────────────────────┘
 */
export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const title = PAGE_TITLES[location.pathname] || 'Dashboard';

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg-page)' }}
    >
      {/* Sidebar */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav title={title} />

        <main
          className="flex-1 overflow-y-auto"
          style={{ backgroundColor: 'var(--color-bg-page)' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
