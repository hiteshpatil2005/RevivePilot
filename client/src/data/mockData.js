/**
 * mockData.js
 *
 * Central store for all frontend mock data.
 * Remove / replace with real API responses as backend endpoints come online.
 *
 * NOTE: Do NOT scatter mock data across individual components.
 */

// ── Auth ──────────────────────────────────────────────────────────────────────
export const MOCK_USER = {
  id: 'usr_demo_001',
  businessName: 'Acme Payments Ltd.',
  fullName: 'Priya Mehta',
  email: 'demo@revivepilot.ai',
  password: 'demo123',          // only used locally — never sent to a real API
  role: 'merchant',
  avatarInitials: 'PM',
  plan: 'Growth',
  joinedAt: '2024-11-15',
};

// ── Recovery Cases ─────────────────────────────────────────────────────────────
export const MOCK_RECOVERY_CASES = [
  {
    id: 'rc_001',
    orderId: 'ord_NkQpX92a',
    customer: 'Rohan Sharma',
    email: 'rohan.s@example.com',
    amount: 18500,
    currency: 'INR',
    reason: 'Card declined — insufficient funds',
    status: 'recovered',
    strategy: 'Retry with UPI link',
    agentId: 'agent_retry',
    createdAt: '2025-08-28T09:14:00Z',
    resolvedAt: '2025-08-28T09:21:00Z',
  },
  {
    id: 'rc_002',
    orderId: 'ord_PmLwT14b',
    customer: 'Ananya Iyer',
    email: 'ananya.i@example.com',
    amount: 4299,
    currency: 'INR',
    reason: 'Payment timeout',
    status: 'in_progress',
    strategy: 'Send recovery email',
    agentId: 'agent_email',
    createdAt: '2025-08-29T14:03:00Z',
    resolvedAt: null,
  },
  {
    id: 'rc_003',
    orderId: 'ord_QrJsA87c',
    customer: 'Vikram Nair',
    email: 'vikram.n@example.com',
    amount: 31200,
    currency: 'INR',
    reason: 'Bank authentication failed',
    status: 'failed',
    strategy: 'Offer alternative payment method',
    agentId: 'agent_alt_payment',
    createdAt: '2025-08-29T16:45:00Z',
    resolvedAt: null,
  },
  {
    id: 'rc_004',
    orderId: 'ord_StUvB21d',
    customer: 'Meera Pillai',
    email: 'meera.p@example.com',
    amount: 7750,
    currency: 'INR',
    reason: 'Network error',
    status: 'pending',
    strategy: 'Auto-retry scheduled',
    agentId: 'agent_retry',
    createdAt: '2025-08-30T08:22:00Z',
    resolvedAt: null,
  },
];

// ── Dashboard KPIs ─────────────────────────────────────────────────────────────
export const MOCK_KPI = {
  revenueAtRisk: 1284500,       // in INR paise × 100 (i.e., ₹12,845.00)
  recoveredRevenue: 892300,
  recoveryRate: 69.5,           // percent
  activeCases: 14,
  agentsRunning: 3,
  avgRecoveryTime: '7m 32s',
};

// ── AI Agents ─────────────────────────────────────────────────────────────────
export const MOCK_AGENTS = [
  { id: 'agent_retry',       name: 'Retry Agent',            status: 'active',  casesHandled: 48, successRate: 74 },
  { id: 'agent_email',       name: 'Email Recovery Agent',   status: 'active',  casesHandled: 31, successRate: 61 },
  { id: 'agent_alt_payment', name: 'Alt-Payment Agent',      status: 'idle',    casesHandled: 19, successRate: 52 },
  { id: 'agent_sms',         name: 'SMS Nudge Agent',        status: 'active',  casesHandled: 22, successRate: 68 },
];

// ── Recent Activity (for live activity feed) ───────────────────────────────────
export const MOCK_ACTIVITY = [
  { id: 'act_1', type: 'recovered',   message: '₹18,500 recovered for Rohan Sharma', time: '2 min ago' },
  { id: 'act_2', type: 'detected',    message: 'New failure detected — ord_PmLwT14b', time: '5 min ago' },
  { id: 'act_3', type: 'agent',       message: 'Retry Agent triggered for ord_QrJsA87c', time: '9 min ago' },
  { id: 'act_4', type: 'policy',      message: 'Policy: max retries reached for ord_XyZab12', time: '14 min ago' },
  { id: 'act_5', type: 'recovered',   message: '₹4,299 recovered for Ananya Iyer', time: '21 min ago' },
];

// ── Sidebar nav items (used by DashboardLayout) ────────────────────────────────
export const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard',    label: 'Dashboard',       path: '/dashboard',    icon: 'LayoutDashboard' },
    ],
  },
  {
    label: 'Revenue Recovery',
    items: [
      { id: 'recovery',     label: 'Recovery Cases',  path: '/recovery',     icon: 'RefreshCcw' },
      { id: 'agents',       label: 'AI Agents',       path: '/agents',       icon: 'Bot' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'transactions', label: 'Transactions',    path: '/transactions', icon: 'CreditCard' },
      { id: 'analytics',    label: 'Analytics',       path: '/analytics',    icon: 'BarChart3' },
    ],
  },
  {
    label: 'Control',
    items: [
      { id: 'policies',     label: 'Policies',        path: '/policies',     icon: 'ShieldCheck' },
      { id: 'audit',        label: 'Audit Logs',      path: '/audit',        icon: 'ScrollText' },
    ],
  },
];
