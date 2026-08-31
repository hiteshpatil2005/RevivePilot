import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import TopNav from '../components/layout/TopNav';
import DemoControls from '../components/realtime/DemoControls';
import { ToastProvider } from '../context/ToastContext';
import Toast from '../components/common/Toast';

/** Maps route paths to human-readable page titles */
const PAGE_TITLES = {
  '/dashboard':    'Dashboard',
  '/recovery':     'Recovery Cases',
  '/agents':       'AI Agents',
  '/transactions': 'Transactions',
  '/analytics':    'Analytics',
  '/policies':     'Policy Center',
  '/audit-logs':   'Audit Logs',
  '/test-payment': 'Test Payment',
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
 *
 * DemoControls floats fixed bottom-right (dev only).
 * Toast stack floats bottom-left.
 */
export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const getTitle = (pathname) => {
    if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
    if (pathname.startsWith('/recovery/')) return 'Recovery Case';
    return 'Dashboard';
  };
  const title = getTitle(location.pathname);

  return (
    <ToastProvider>
      <div
        className="flex h-screen overflow-hidden"
        style={{ backgroundColor: 'var(--color-bg-page)' }}
      >
        {/* Sidebar */}
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

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

        {/* Demo real-time event controls (dev only) */}
        <DemoControls />

        {/* Global Toast notifications */}
        <Toast />
      </div>
    </ToastProvider>
  );
}
