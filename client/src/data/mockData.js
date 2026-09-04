/**
 * mockData.js — Central mock data store for RevivePilot frontend.
 * Purged of all fake/dummy transactions, cases, customers, and metrics.
 * Configured strictly for merchant hiteshpatil0205@gmail.com.
 */

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_USER = {
  id: 'usr_hitesh_owner',
  businessName: 'RevivePilot Revenue Recovery',
  fullName: 'Hitesh Patil',
  email: 'hiteshpatil0205@gmail.com',
  password: 'Hitesh@12345',
  role: 'OWNER',
  avatarInitials: 'HP',
  plan: 'Enterprise',
  joinedAt: '2025-01-01',
};

// ─────────────────────────────────────────────────────────────────────────────
// MERCHANT PROFILE
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_MERCHANT_PROFILE = {
  id: 'merchant_hitesh',
  businessName: 'RevivePilot Revenue Recovery',
  displayName: 'Hitesh Patil',
  email: 'hiteshpatil0205@gmail.com',
  phone: '+91 98765 43210',
  gstin: 'GSTIN27AABCP1234A1Z1',
  plan: 'Enterprise',
  planLimits: {
    monthlyRecoveries: 5000,
    used: 0,
  },
  joinedAt: '2025-01-01',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  webhookUrl: '',
  apiKeyMasked: 'rzp_test_••••••••••••xxxx',
};

// ─────────────────────────────────────────────────────────────────────────────
// SIDEBAR NAV
// ─────────────────────────────────────────────────────────────────────────────
export const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard',    label: 'Dashboard',      path: '/dashboard',    icon: 'LayoutDashboard' },
    ],
  },
  {
    label: 'Revenue Recovery',
    items: [
      { id: 'recovery',     label: 'Recovery Cases', path: '/recovery',     icon: 'RefreshCcw' },
      { id: 'agents',       label: 'AI Agents',      path: '/agents',       icon: 'Bot' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { id: 'transactions', label: 'Transactions',   path: '/transactions', icon: 'CreditCard' },
      { id: 'analytics',    label: 'Analytics',      path: '/analytics',    icon: 'BarChart3' },
    ],
  },
  {
    label: 'Control',
    items: [
      { id: 'policies',     label: 'Policies',       path: '/policies',     icon: 'ShieldCheck' },
      { id: 'audit',        label: 'Audit Logs',     path: '/audit-logs',   icon: 'ScrollText' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD KPIs (Zeroed by default — populated strictly from live PostgreSQL)
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_DASHBOARD_METRICS = {
  revenueAtRisk:       0,
  expectedRecovery:    0,
  recoveredRevenue:    0,
  activeCases:         0,
  highPriorityCases:   0,
  agentsRunning:       3,
  avgRecoveryTime:     '0s',
  recoveryRate:        0,
  revenueAtRiskDelta:  0,
  recoveredDelta:      0,
  recoveryRateDelta:   0,
  totalEventsToday:    0,
  atRiskCases:         0,
  aiQualified:         0,
  recoveryAttempted:   0,
  recoveredCount:      0,
  totalAtRiskAmount:   0,
  totalExpectedAmount: 0,
  totalRecoveredAmount: 0,
};

// ─────────────────────────────────────────────────────────────────────────────
// REVENUE CHART DATA (Empty by default)
// ─────────────────────────────────────────────────────────────────────────────
const makeChartPoint = (label, atRisk, expected, recovered) => ({ label, atRisk, expected, recovered });

export const REVENUE_CHART_DATA = {
  '7D': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => makeChartPoint(day, 0, 0, 0)),
  '30D': [],
  '90D': [],
};

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMERS (Empty — populated strictly from live DB)
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_CUSTOMERS = [];

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTIONS (Empty — populated strictly from live DB)
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_TRANSACTIONS = [];

// ─────────────────────────────────────────────────────────────────────────────
// RECOVERY CASES (Empty — populated strictly from live DB)
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_RECOVERY_CASES = [];

// ─────────────────────────────────────────────────────────────────────────────
// AI AGENTS
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_AGENTS = [
  {
    id: 'agent_detection',
    name: 'Detection Agent',
    description: 'Monitors payment events and identifies revenue at risk in real time.',
    status: 'online',
    currentTask: null,
    tasksProcessed: 0,
    successRate: 100,
    avgLatency: '0.0s',
    lastActivity: 'Active',
    type: 'detection',
  },
  {
    id: 'agent_rootcause',
    name: 'Root Cause Agent',
    description: 'Classifies failure reasons using ML-based pattern recognition.',
    status: 'online',
    currentTask: null,
    tasksProcessed: 0,
    successRate: 100,
    avgLatency: '0.0s',
    lastActivity: 'Active',
    type: 'rootcause',
  },
  {
    id: 'agent_strategy',
    name: 'Strategy Agent',
    description: 'Selects optimal recovery strategy based on failure type, customer profile, and history.',
    status: 'online',
    currentTask: null,
    tasksProcessed: 0,
    successRate: 100,
    avgLatency: '0.0s',
    lastActivity: 'Active',
    type: 'strategy',
  },
  {
    id: 'agent_learning',
    name: 'Learning Agent',
    description: 'Continuously improves recovery models from historical outcomes.',
    status: 'online',
    currentTask: null,
    tasksProcessed: 0,
    successRate: 100,
    avgLatency: '0.0s',
    lastActivity: 'Active',
    type: 'learning',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LIVE ACTIVITY
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_LIVE_ACTIVITY = [];

// ─────────────────────────────────────────────────────────────────────────────
// RECOVERY FUNNEL
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_RECOVERY_FUNNEL = [
  { label: 'Revenue Events',       value: 0, pct: 100 },
  { label: 'At Risk',              value: 0, pct: 0   },
  { label: 'AI Qualified',         value: 0, pct: 0   },
  { label: 'Recovery Attempted',   value: 0, pct: 0   },
  { label: 'Successfully Recovered', value: 0, pct: 0 },
];

// ─────────────────────────────────────────────────────────────────────────────
// HIGH PRIORITY CASES
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_HIGH_PRIORITY = [];

// ─────────────────────────────────────────────────────────────────────────────
// AGENT ACTIVITY LOG
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_AGENT_ACTIVITY = [];

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS — Revenue Metrics
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_ANALYTICS_METRICS = {
  totalRevenueProcessed: 0,
  revenueAtRisk:         0,
  expectedRecovery:      0,
  actualRecovered:       0,
  recoveryRate:          0,
  revenueSaved:          0,
  recoveryRealization:   0,
  totalProcessedDelta:   0,
  atRiskDelta:           0,
  expectedDelta:         0,
  recoveredDelta:        0,
  recoveryRateDelta:     0,
  savedDelta:            0,
};

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS — Recovery Rate Over Time
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_RECOVERY_RATE_DATA = {
  '7D': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(label => ({ label, current: 0, previous: 0 })),
  '30D': [],
  '90D': [],
};

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS — Strategy Performance
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_STRATEGY_PERFORMANCE = [];

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS — Revenue Leakage Breakdown
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_REVENUE_BREAKDOWN = [];

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS — AI Effectiveness
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_AI_EFFECTIVENESS = {
  aiQualifiedCases:     0,
  successfulStrategies: 0,
  aiSuccessRate:        0,
  avgDecisionTimeSec:   0,
  revenueRecovered:     0,
  agentAccuracy: [
    { agent: 'Detection Agent',  accuracy: 100, icon: 'Search' },
    { agent: 'Root Cause Agent', accuracy: 100, icon: 'Microscope' },
    { agent: 'Strategy Agent',   accuracy: 100, icon: 'Lightbulb' },
    { agent: 'Learning Agent',   accuracy: 100, icon: 'Brain' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// POLICIES
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_POLICY_OVERVIEW = {
  activePolicies:    4,
  actionsRestricted: 0,
  pendingReview:     0,
  violationsToday:   0,
};

export const MOCK_POLICY_CATEGORIES = [
  { id: 'retry',        label: 'Retry Policy',          icon: 'RefreshCcw',  status: 'active', rules: 1, updatedAt: 'Active' },
  { id: 'amount',       label: 'Amount Limits',          icon: 'DollarSign',  status: 'active', rules: 1, updatedAt: 'Active' },
  { id: 'customer',     label: 'Customer Protection',    icon: 'UserShield',  status: 'active', rules: 1, updatedAt: 'Active' },
  { id: 'cooldown',     label: 'Cooldown Rules',         icon: 'Clock',       status: 'active', rules: 1, updatedAt: 'Active' },
  { id: 'escalation',   label: 'Escalation Rules',       icon: 'AlertTriangle', status: 'active', rules: 1, updatedAt: 'Active' },
  { id: 'time',         label: 'Time Restrictions',      icon: 'Timer',       status: 'active', rules: 0, updatedAt: 'Active' },
  { id: 'subscription', label: 'Subscription Recovery',  icon: 'Repeat',      status: 'active', rules: 0, updatedAt: 'Active' },
  { id: 'invoice',      label: 'Invoice Recovery',       icon: 'FileText',    status: 'active', rules: 0, updatedAt: 'Active' },
];

export const DEFAULT_RETRY_POLICY = {
  maxRetryAttempts:    3,
  cooldownMinutes:     30,
  maxRetryAmountINR:   50000,
  allowAutoRetry:      true,
};

export const MOCK_STOPPING_RULES = [
  { id: 'sr_1', label: 'Stop after successful recovery',          enabled: true },
  { id: 'sr_2', label: 'Stop after maximum attempts reached',     enabled: true },
  { id: 'sr_3', label: 'Stop after customer opts out',           enabled: true },
  { id: 'sr_4', label: 'Stop after policy violation',            enabled: true },
  { id: 'sr_5', label: 'Stop after payment window expires',      enabled: true },
  { id: 'sr_6', label: 'Stop after recovery window expires',     enabled: true },
];

export const MOCK_ESCALATION_RULES = [
  { id: 'er_1', label: 'Recovery amount exceeds ₹50,000',        enabled: true },
  { id: 'er_2', label: 'Recovery probability below 40%',         enabled: true },
  { id: 'er_3', label: 'Maximum retries reached',                enabled: true },
  { id: 'er_4', label: 'Customer dispute detected',              enabled: true },
  { id: 'er_5', label: 'Policy violation detected',              enabled: false },
  { id: 'er_6', label: 'AI confidence below 70%',                enabled: true },
];

// ─────────────────────────────────────────────────────────────────────────────
// AUDIT LOGS (Empty — populated strictly from live PostgreSQL)
// ─────────────────────────────────────────────────────────────────────────────
export const AUDIT_EVENT_TYPES = {
  PAYMENT_RECEIVED:       'PAYMENT_RECEIVED',
  PAYMENT_FAILED:         'PAYMENT_FAILED',
  RISK_DETECTED:          'RISK_DETECTED',
  ROOT_CAUSE_IDENTIFIED:  'ROOT_CAUSE_IDENTIFIED',
  STRATEGY_SELECTED:      'STRATEGY_SELECTED',
  POLICY_EVALUATED:       'POLICY_EVALUATED',
  POLICY_APPROVED:        'POLICY_APPROVED',
  POLICY_BLOCKED:         'POLICY_BLOCKED',
  ACTION_STARTED:         'ACTION_STARTED',
  ACTION_COMPLETED:       'ACTION_COMPLETED',
  ACTION_FAILED:          'ACTION_FAILED',
  PAYMENT_RECOVERED:      'PAYMENT_RECOVERED',
  CASE_ESCALATED:         'CASE_ESCALATED',
  CASE_STOPPED:           'CASE_STOPPED',
};

export const MOCK_AUDIT_LOGS = [];

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS (Empty — populated strictly from live PostgreSQL)
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_NOTIFICATIONS = [];

// ─────────────────────────────────────────────────────────────────────────────
// REALTIME EVENT TYPES
// ─────────────────────────────────────────────────────────────────────────────
export const REALTIME_EVENT_TYPES = {
  PAYMENT_CREATED:        'PAYMENT_CREATED',
  PAYMENT_FAILED:         'PAYMENT_FAILED',
  RECOVERY_CASE_CREATED:  'RECOVERY_CASE_CREATED',
  RECOVERY_CASE_UPDATED:  'RECOVERY_CASE_UPDATED',
  AGENT_STARTED:          'AGENT_STARTED',
  AGENT_COMPLETED:        'AGENT_COMPLETED',
  POLICY_APPROVED:        'POLICY_APPROVED',
  POLICY_BLOCKED:         'POLICY_BLOCKED',
  ACTION_STARTED:         'ACTION_STARTED',
  ACTION_COMPLETED:       'ACTION_COMPLETED',
  RECOVERY_SUCCESS:       'RECOVERY_SUCCESS',
  RECOVERY_FAILED:        'RECOVERY_FAILED',
};

// ─────────────────────────────────────────────────────────────────────────────
// 25 REALTIME PAYMENT FAILURE TAXONOMY
// ─────────────────────────────────────────────────────────────────────────────
export const FAILURE_CAUSES_TAXONOMY = {
  INSUFFICIENT_FUNDS: {
    id: 'INSUFFICIENT_FUNDS',
    label: 'Insufficient Funds',
    category: 'Customer/Bank',
    code: 'insufficient_funds',
    strategy: 'Delayed Retry + Balance Nudge',
    color: '#d97706',
  },
  BANK_DECLINED: {
    id: 'BANK_DECLINED',
    label: 'Bank Declined',
    category: 'Bank',
    code: 'payment_declined_by_bank',
    strategy: 'Alternative Rail / Switch to UPI',
    color: '#dc2626',
  },
  CARD_EXPIRED: {
    id: 'CARD_EXPIRED',
    label: 'Card Expired',
    category: 'Card',
    code: 'card_expired',
    strategy: 'Update Card Details / One-Click UPI Link',
    color: '#ea580c',
  },
  CARD_BLOCKED: {
    id: 'CARD_BLOCKED',
    label: 'Card Blocked',
    category: 'Card/Bank',
    code: 'card_blocked',
    strategy: 'Alternative Payment Method (UPI/NetBanking)',
    color: '#b91c1c',
  },
  INCORRECT_CARD_DETAILS: {
    id: 'INCORRECT_CARD_DETAILS',
    label: 'Incorrect Card Details',
    category: 'Customer',
    code: 'invalid_card_details',
    strategy: 'In-Session Card Details Re-prompt Modal',
    color: '#d97706',
  },
  INVALID_UPI_ID: {
    id: 'INVALID_UPI_ID',
    label: 'Invalid UPI ID / VPA',
    category: 'Customer',
    code: 'invalid_vpa',
    strategy: 'UPI VPA Auto-Correction / Dynamic QR Code',
    color: '#dc2626',
  },
  UPI_PAYMENT_DECLINED: {
    id: 'UPI_PAYMENT_DECLINED',
    label: 'UPI Payment Declined',
    category: 'Customer/Bank',
    code: 'upi_mpin_or_bank_declined',
    strategy: 'UPI Intent Re-trigger / Alternative PSP App',
    color: '#b91c1c',
  },
  UPI_TIMEOUT: {
    id: 'UPI_TIMEOUT',
    label: 'UPI Timeout',
    category: 'UPI/Network',
    code: 'upi_transaction_timeout',
    strategy: 'Dynamic UPI Push with Extended Window',
    color: '#ea580c',
  },
  UPI_COLLECT_REQUEST_EXPIRED: {
    id: 'UPI_COLLECT_REQUEST_EXPIRED',
    label: 'UPI Collect Request Expired',
    category: 'Customer/UPI',
    code: 'upi_collect_expired',
    strategy: 'Fresh Instant UPI Collect Notification',
    color: '#4b5563',
  },
  CUSTOMER_CANCELLED: {
    id: 'CUSTOMER_CANCELLED',
    label: 'Customer Cancelled',
    category: 'Customer',
    code: 'payment_cancelled_by_user',
    strategy: 'Abandoned Cart Email & WhatsApp Recovery Link',
    color: '#64748b',
  },
  PAYMENT_TIMEOUT: {
    id: 'PAYMENT_TIMEOUT',
    label: 'Payment Timeout',
    category: 'Network/Gateway',
    code: 'gateway_timeout',
    strategy: 'Asynchronous Status Poll & Delayed Retry',
    color: '#9333ea',
  },
  BANK_DOWNTIME: {
    id: 'BANK_DOWNTIME',
    label: 'Bank Downtime',
    category: 'Bank',
    code: 'bank_downtime',
    strategy: 'Dynamic Rail Failover to Secondary Acquirer',
    color: '#b91c1c',
  },
  GATEWAY_ERROR: {
    id: 'GATEWAY_ERROR',
    label: 'Gateway Error',
    category: 'Gateway',
    code: 'gateway_processing_error',
    strategy: 'Instant Sub-Second Acquirer Route Failover',
    color: '#dc2626',
  },
  NETWORK_FAILURE: {
    id: 'NETWORK_FAILURE',
    label: 'Network Failure',
    category: 'Network',
    code: 'network_connection_reset',
    strategy: 'Instant Idempotent Network Retry',
    color: '#9333ea',
  },
  TECHNICAL_ERROR: {
    id: 'TECHNICAL_ERROR',
    label: 'Technical Error',
    category: 'System',
    code: 'unexpected_system_error',
    strategy: 'Idempotent Safe Re-attempt Pipeline',
    color: '#dc2626',
  },
  PAYMENT_METHOD_UNAVAILABLE: {
    id: 'PAYMENT_METHOD_UNAVAILABLE',
    label: 'Payment Method Unavailable',
    category: 'Gateway/Bank',
    code: 'payment_method_disabled',
    strategy: 'Smart 1-Click Alternative Method Recommendation',
    color: '#64748b',
  },
  LIMIT_EXCEEDED: {
    id: 'LIMIT_EXCEEDED',
    label: 'Limit Exceeded',
    category: 'Customer/Bank',
    code: 'transaction_limit_exceeded',
    strategy: '2-Part Split Payment / Higher-Limit Rail',
    color: '#d97706',
  },
  AUTHENTICATION_FAILED: {
    id: 'AUTHENTICATION_FAILED',
    label: 'Authentication Failed',
    category: 'Customer/Bank',
    code: '3ds_authentication_failed',
    strategy: 'Biometric 3DS 2.0 Re-prompt & WhatsApp Backup OTP',
    color: '#d97706',
  },
  MANDATE_FAILED: {
    id: 'MANDATE_FAILED',
    label: 'Mandate Failed',
    category: 'Subscription',
    code: 'e_mandate_execution_failed',
    strategy: 'Mandate Batch Presentation in Next Cycle',
    color: '#d97706',
  },
  MANDATE_REVOKED: {
    id: 'MANDATE_REVOKED',
    label: 'Mandate Cancelled/Revoked',
    category: 'Subscription/Customer',
    code: 'mandate_cancelled_by_customer',
    strategy: 'New E-Mandate 1-Click Authorization Link',
    color: '#dc2626',
  },
  RECURRING_PAYMENT_FAILED: {
    id: 'RECURRING_PAYMENT_FAILED',
    label: 'Recurring Payment Failed',
    category: 'Subscription',
    code: 'subscription_charge_failed',
    strategy: '3-Day Grace Period Retry & Customer Alert',
    color: '#ea580c',
  },
  DUPLICATE_PAYMENT_ATTEMPT: {
    id: 'DUPLICATE_PAYMENT_ATTEMPT',
    label: 'Duplicate Payment Attempt',
    category: 'Customer/System',
    code: 'duplicate_idempotency_key',
    strategy: 'Deduplication & Auto-Refund Safeguard',
    color: '#2563eb',
  },
  RISK_FRAUD_DECLINE: {
    id: 'RISK_FRAUD_DECLINE',
    label: 'Risk/Fraud Decline',
    category: 'Risk/Compliance',
    code: 'fraud_security_trigger',
    strategy: 'Enhanced 3DS Step-Up Verification / Manual Review',
    color: '#b91c1c',
  },
  LATE_AUTHORIZATION: {
    id: 'LATE_AUTHORIZATION',
    label: 'Late Authorization',
    category: 'Bank/Gateway',
    code: 'late_authorization_received',
    strategy: 'Asynchronous Reconciliation to RECOVERED Status',
    color: '#0891b2',
  },
  UNKNOWN_FAILURE: {
    id: 'UNKNOWN_FAILURE',
    label: 'Unknown/Unclassified Failure',
    category: 'Unknown',
    code: 'unclassified_failure',
    strategy: 'Heuristic Deep Scan & Multi-Channel Recovery Link',
    color: '#64748b',
  },
};
