/**
 * mockData.js — Central mock data store for RevivePilot frontend.
 *
 * Replace individual exports with real API calls as backend comes online.
 * Never scatter mock data across components.
 *
 * DATA MODEL (mirrors planned DB schema):
 *   Merchant → Customers → Transactions → RecoveryCases
 *                                              └── AIDecisions / PolicyDecisions / Attempts / Outcome
 */

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_USER = {
  id: 'usr_demo_001',
  businessName: 'Acme Corporation',
  fullName: 'Priya Mehta',
  email: 'admin@acme.com',
  password: 'demo123',
  role: 'merchant',
  avatarInitials: 'PM',
  plan: 'Growth',
  joinedAt: '2024-11-15',
};

// ─────────────────────────────────────────────────────────────────────────────
// MERCHANT PROFILE
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_MERCHANT_PROFILE = {
  id: 'merchant_001',
  businessName: 'Acme Corporation',
  displayName: 'Priya Mehta',
  email: 'admin@acme.com',
  phone: '+91 98765 43210',
  gstin: 'GSTIN29AABCM1234A1Z5',
  plan: 'Growth',
  planLimits: {
    monthlyRecoveries: 5000,
    used: 1284,
  },
  joinedAt: '2024-11-15',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  webhookUrl: '',
  apiKeyMasked: 'rzp_live_••••••••••••xxxx',
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
      { id: 'test-payment', label: 'Test Payment',   path: '/test-payment', icon: 'FlaskConical' },
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
// DASHBOARD KPIs
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_DASHBOARD_METRICS = {
  revenueAtRisk:       84200000,   // paise (₹8.42L)
  expectedRecovery:    63100000,   // paise (₹6.31L)
  recoveredRevenue:    21400000,   // paise (₹2.14L)
  activeCases:         18,
  highPriorityCases:   6,
  agentsRunning:       3,
  avgRecoveryTime:     '7m 32s',
  recoveryRate:        74.9,
  revenueAtRiskDelta:  12.4,       // % vs previous period
  recoveredDelta:      18.7,
  recoveryRateDelta:   4.1,
  totalEventsToday:    1284,
  atRiskCases:         312,
  aiQualified:         221,
  recoveryAttempted:   168,
  successfulRecovery:  121,
};

// ─────────────────────────────────────────────────────────────────────────────
// REVENUE CHART DATA  (7D / 30D / 90D)
// ─────────────────────────────────────────────────────────────────────────────
const makeChartPoint = (label, atRisk, expected, recovered) => ({ label, atRisk, expected, recovered });

export const REVENUE_CHART_DATA = {
  '7D': [
    makeChartPoint('Mon', 42000, 32000, 18000),
    makeChartPoint('Tue', 58000, 44000, 28000),
    makeChartPoint('Wed', 73000, 55000, 41000),
    makeChartPoint('Thu', 61000, 48000, 35000),
    makeChartPoint('Fri', 84200, 63100, 21400),
    makeChartPoint('Sat', 49000, 38000, 29000),
    makeChartPoint('Sun', 35000, 27000, 21000),
  ],
  '30D': Array.from({ length: 30 }, (_, i) => {
    const day = new Date(2025, 7, 1 + i);
    const label = `${day.getDate()}/${day.getMonth() + 1}`;
    const base = 35000 + Math.sin(i * 0.4) * 18000 + i * 900;
    return makeChartPoint(label, Math.round(base), Math.round(base * 0.75), Math.round(base * 0.39));
  }),
  '90D': Array.from({ length: 12 }, (_, i) => {
    const labels = ['W1','W2','W3','W4','W5','W6','W7','W8','W9','W10','W11','W12'];
    const base = 280000 + Math.sin(i * 0.5) * 80000 + i * 5000;
    return makeChartPoint(labels[i], Math.round(base), Math.round(base * 0.74), Math.round(base * 0.38));
  }),
};

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOMERS
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_CUSTOMERS = [
  {
    id: 'cust_001', name: 'Rahul Sharma',    email: 'rahul.s@example.com',
    phone: '+91 98765 43210', totalPayments: 27, successPayments: 25,
    failedPayments: 2, lifetimeValue: 320000, successRate: 92.6,
  },
  {
    id: 'cust_002', name: 'Ananya Iyer',     email: 'ananya.i@example.com',
    phone: '+91 91234 56789', totalPayments: 14, successPayments: 13,
    failedPayments: 1, lifetimeValue: 84000, successRate: 92.9,
  },
  {
    id: 'cust_003', name: 'Vikram Nair',     email: 'vikram.n@example.com',
    phone: '+91 70123 45678', totalPayments: 8, successPayments: 6,
    failedPayments: 2, lifetimeValue: 156000, successRate: 75.0,
  },
  {
    id: 'cust_004', name: 'Meera Pillai',    email: 'meera.p@example.com',
    phone: '+91 80123 45670', totalPayments: 19, successPayments: 18,
    failedPayments: 1, lifetimeValue: 211000, successRate: 94.7,
  },
  {
    id: 'cust_005', name: 'Arjun Kapoor',    email: 'arjun.k@example.com',
    phone: '+91 99876 54321', totalPayments: 41, successPayments: 38,
    failedPayments: 3, lifetimeValue: 490000, successRate: 92.7,
  },
  {
    id: 'cust_006', name: 'Sneha Reddy',     email: 'sneha.r@example.com',
    phone: '+91 88765 43210', totalPayments: 6, successPayments: 5,
    failedPayments: 1, lifetimeValue: 62000, successRate: 83.3,
  },
  {
    id: 'cust_007', name: 'Kavya Menon',     email: 'kavya.m@example.com',
    phone: '+91 77654 32109', totalPayments: 33, successPayments: 31,
    failedPayments: 2, lifetimeValue: 278000, successRate: 93.9,
  },
  {
    id: 'cust_008', name: 'Rohit Desai',     email: 'rohit.d@example.com',
    phone: '+91 96543 21098', totalPayments: 11, successPayments: 9,
    failedPayments: 2, lifetimeValue: 98000, successRate: 81.8,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTIONS
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_TRANSACTIONS = [
  {
    id: 'pay_RC10291', customerId: 'cust_001', amount: 25000, method: 'CARD',
    status: 'failed', failureReason: 'BANK_TIMEOUT', recoveryCase: 'RC-10291',
    createdAt: '2025-08-30T23:41:00Z',
  },
  {
    id: 'pay_RC10292', customerId: 'cust_002', amount: 4299, method: 'UPI',
    status: 'failed', failureReason: 'NETWORK_ERROR', recoveryCase: 'RC-10292',
    createdAt: '2025-08-30T22:18:00Z',
  },
  {
    id: 'pay_RC10293', customerId: 'cust_003', amount: 75000, method: 'CARD',
    status: 'failed', failureReason: 'CARD_DECLINED', recoveryCase: 'RC-10293',
    createdAt: '2025-08-30T21:05:00Z',
  },
  {
    id: 'pay_RC10294', customerId: 'cust_004', amount: 12500, method: 'NET_BANKING',
    status: 'failed', failureReason: 'INSUFFICIENT_FUNDS', recoveryCase: 'RC-10294',
    createdAt: '2025-08-30T20:33:00Z',
  },
  {
    id: 'pay_RC10295', customerId: 'cust_005', amount: 8800, method: 'UPI',
    status: 'failed', failureReason: 'MANDATE_FAILED', recoveryCase: 'RC-10295',
    createdAt: '2025-08-30T19:47:00Z',
  },
  {
    id: 'pay_RC10296', customerId: 'cust_006', amount: 3400, method: 'WALLET',
    status: 'failed', failureReason: 'UNKNOWN', recoveryCase: 'RC-10296',
    createdAt: '2025-08-30T18:22:00Z',
  },
  {
    id: 'pay_RC10297', customerId: 'cust_007', amount: 18700, method: 'CARD',
    status: 'success', failureReason: null, recoveryCase: null,
    createdAt: '2025-08-30T17:59:00Z',
  },
  {
    id: 'pay_RC10298', customerId: 'cust_008', amount: 6200, method: 'UPI',
    status: 'success', failureReason: null, recoveryCase: null,
    createdAt: '2025-08-30T17:12:00Z',
  },
  {
    id: 'pay_RC10299', customerId: 'cust_001', amount: 44000, method: 'CARD',
    status: 'success', failureReason: null, recoveryCase: null,
    createdAt: '2025-08-30T16:48:00Z',
  },
  {
    id: 'pay_RC10300', customerId: 'cust_002', amount: 9900, method: 'NET_BANKING',
    status: 'pending', failureReason: null, recoveryCase: null,
    createdAt: '2025-08-30T16:05:00Z',
  },
  {
    id: 'pay_RC10301', customerId: 'cust_003', amount: 31500, method: 'CARD',
    status: 'refunded', failureReason: null, recoveryCase: null,
    createdAt: '2025-08-29T14:22:00Z',
  },
  {
    id: 'pay_RC10302', customerId: 'cust_004', amount: 5700, method: 'UPI',
    status: 'failed', failureReason: 'BANK_TIMEOUT', recoveryCase: 'RC-10302',
    createdAt: '2025-08-29T13:11:00Z',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// RECOVERY CASES
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_RECOVERY_CASES = [
  {
    id: 'RC-10291', paymentId: 'pay_RC10291', customerId: 'cust_001',
    amount: 25000, currency: 'INR', riskScore: 91,
    rootCause: 'BANK_TIMEOUT', rootCauseConfidence: 94, rootCauseCategory: 'Temporary Gateway / Bank Failure',
    strategy: 'Delayed Retry', strategyRecoveryProbability: 91, expectedRecovery: 22750,
    status: 'recovered', priority: 'high',
    policyPassed: true, policyChecks: [
      { label: 'Maximum retries', value: '1 / 3', passed: true },
      { label: 'Cooldown period', value: 'Passed', passed: true },
      { label: 'Amount limit',    value: 'Passed', passed: true },
      { label: 'Customer flags',  value: 'None',   passed: true },
    ],
    attempts: 1, maxAttempts: 3,
    actualRecovered: 25000, recoveryTime: 31,
    createdAt: '2025-08-30T23:41:00Z', resolvedAt: '2025-08-30T23:41:31Z',
    timeline: [
      { step: 'detected',  label: 'Revenue Risk Detected',  detail: 'Payment failure identified',          ts: '23:41:02', status: 'done' },
      { step: 'detection', label: 'Detection Agent',         detail: 'BANK_TIMEOUT pattern matched',        ts: '23:41:04', status: 'done' },
      { step: 'rootcause', label: 'Root Cause Agent',        detail: 'BANK_TIMEOUT • Confidence 94%',       ts: '23:41:07', status: 'done' },
      { step: 'strategy',  label: 'Strategy Agent',          detail: 'Delayed Retry • Probability 91%',     ts: '23:41:10', status: 'done' },
      { step: 'policy',    label: 'Policy Engine',           detail: '4 / 4 checks passed',                 ts: '23:41:13', status: 'done' },
      { step: 'action',    label: 'Recovery Action',         detail: 'Retry executed',                      ts: '23:41:19', status: 'done' },
      { step: 'outcome',   label: 'Payment Recovered',       detail: '₹25,000 recovered in 31 seconds',    ts: '23:41:31', status: 'done' },
    ],
  },
  {
    id: 'RC-10292', paymentId: 'pay_RC10292', customerId: 'cust_002',
    amount: 4299, currency: 'INR', riskScore: 72,
    rootCause: 'NETWORK_ERROR', rootCauseConfidence: 88, rootCauseCategory: 'Transient Network Failure',
    strategy: 'Recovery Email', strategyRecoveryProbability: 68, expectedRecovery: 2923,
    status: 'executing', priority: 'medium',
    policyPassed: true, policyChecks: [
      { label: 'Maximum retries', value: '1 / 3', passed: true },
      { label: 'Cooldown period', value: 'Passed', passed: true },
      { label: 'Amount limit',    value: 'Passed', passed: true },
      { label: 'Customer flags',  value: 'None',   passed: true },
    ],
    attempts: 1, maxAttempts: 3,
    actualRecovered: null, recoveryTime: null,
    createdAt: '2025-08-30T22:18:00Z', resolvedAt: null,
    timeline: [
      { step: 'detected',  label: 'Revenue Risk Detected',  detail: 'Payment failure identified',          ts: '22:18:05', status: 'done' },
      { step: 'detection', label: 'Detection Agent',         detail: 'NETWORK_ERROR pattern matched',       ts: '22:18:07', status: 'done' },
      { step: 'rootcause', label: 'Root Cause Agent',        detail: 'NETWORK_ERROR • Confidence 88%',     ts: '22:18:11', status: 'done' },
      { step: 'strategy',  label: 'Strategy Agent',          detail: 'Recovery Email • Probability 68%',   ts: '22:18:14', status: 'done' },
      { step: 'policy',    label: 'Policy Engine',           detail: '4 / 4 checks passed',               ts: '22:18:16', status: 'done' },
      { step: 'action',    label: 'Recovery Action',         detail: 'Email dispatched — awaiting payment', ts: '22:18:21', status: 'active' },
      { step: 'outcome',   label: 'Awaiting Payment',        detail: 'Pending customer action',            ts: null,        status: 'pending' },
    ],
  },
  {
    id: 'RC-10293', paymentId: 'pay_RC10293', customerId: 'cust_003',
    amount: 75000, currency: 'INR', riskScore: 94,
    rootCause: 'CARD_DECLINED', rootCauseConfidence: 91, rootCauseCategory: 'Permanent Card Failure',
    strategy: 'Alt Payment Link', strategyRecoveryProbability: 82, expectedRecovery: 61500,
    status: 'pending', priority: 'high',
    policyPassed: true, policyChecks: [
      { label: 'Maximum retries', value: '0 / 3', passed: true },
      { label: 'Cooldown period', value: 'Passed', passed: true },
      { label: 'Amount limit',    value: 'Passed', passed: true },
      { label: 'Customer flags',  value: 'None',   passed: true },
    ],
    attempts: 0, maxAttempts: 3,
    actualRecovered: null, recoveryTime: null,
    createdAt: '2025-08-30T21:05:00Z', resolvedAt: null,
    timeline: [
      { step: 'detected',  label: 'Revenue Risk Detected',  detail: 'Payment failure identified',          ts: '21:05:12', status: 'done' },
      { step: 'detection', label: 'Detection Agent',         detail: 'CARD_DECLINED pattern matched',       ts: '21:05:14', status: 'done' },
      { step: 'rootcause', label: 'Root Cause Agent',        detail: 'CARD_DECLINED • Confidence 91%',     ts: '21:05:18', status: 'done' },
      { step: 'strategy',  label: 'Strategy Agent',          detail: 'Alt Payment Link • Probability 82%', ts: '21:05:22', status: 'done' },
      { step: 'policy',    label: 'Policy Engine',           detail: 'Awaiting approval',                   ts: null,       status: 'active' },
      { step: 'action',    label: 'Recovery Action',         detail: 'Not started',                         ts: null,       status: 'pending' },
      { step: 'outcome',   label: 'Outcome',                 detail: 'Not started',                         ts: null,       status: 'pending' },
    ],
  },
  {
    id: 'RC-10294', paymentId: 'pay_RC10294', customerId: 'cust_004',
    amount: 12500, currency: 'INR', riskScore: 78,
    rootCause: 'INSUFFICIENT_FUNDS', rootCauseConfidence: 96, rootCauseCategory: 'Customer Funds Issue',
    strategy: 'SMS Nudge + UPI', strategyRecoveryProbability: 61, expectedRecovery: 7625,
    status: 'analyzing', priority: 'medium',
    policyPassed: null, policyChecks: [],
    attempts: 0, maxAttempts: 3,
    actualRecovered: null, recoveryTime: null,
    createdAt: '2025-08-30T20:33:00Z', resolvedAt: null,
    timeline: [
      { step: 'detected',  label: 'Revenue Risk Detected',  detail: 'Payment failure identified',          ts: '20:33:09', status: 'done' },
      { step: 'detection', label: 'Detection Agent',         detail: 'INSUFFICIENT_FUNDS matched',         ts: '20:33:11', status: 'done' },
      { step: 'rootcause', label: 'Root Cause Agent',        detail: 'Analyzing...',                        ts: null,       status: 'active' },
      { step: 'strategy',  label: 'Strategy Agent',          detail: 'Not started',                         ts: null,       status: 'pending' },
      { step: 'policy',    label: 'Policy Engine',           detail: 'Not started',                         ts: null,       status: 'pending' },
      { step: 'action',    label: 'Recovery Action',         detail: 'Not started',                         ts: null,       status: 'pending' },
      { step: 'outcome',   label: 'Outcome',                 detail: 'Not started',                         ts: null,       status: 'pending' },
    ],
  },
  {
    id: 'RC-10295', paymentId: 'pay_RC10295', customerId: 'cust_005',
    amount: 8800, currency: 'INR', riskScore: 65,
    rootCause: 'MANDATE_FAILED', rootCauseConfidence: 87, rootCauseCategory: 'Mandate / Subscription Failure',
    strategy: 'Re-mandate Request', strategyRecoveryProbability: 74, expectedRecovery: 6512,
    status: 'failed', priority: 'low',
    policyPassed: false, policyChecks: [
      { label: 'Maximum retries', value: '3 / 3', passed: false },
      { label: 'Cooldown period', value: 'Passed', passed: true },
      { label: 'Amount limit',    value: 'Passed', passed: true },
      { label: 'Customer flags',  value: 'None',   passed: true },
    ],
    attempts: 3, maxAttempts: 3,
    actualRecovered: null, recoveryTime: null,
    createdAt: '2025-08-30T19:47:00Z', resolvedAt: '2025-08-30T20:15:00Z',
    timeline: [
      { step: 'detected',  label: 'Revenue Risk Detected',  detail: 'Payment failure identified',          ts: '19:47:02', status: 'done' },
      { step: 'detection', label: 'Detection Agent',         detail: 'MANDATE_FAILED matched',             ts: '19:47:04', status: 'done' },
      { step: 'rootcause', label: 'Root Cause Agent',        detail: 'MANDATE_FAILED • Confidence 87%',   ts: '19:47:07', status: 'done' },
      { step: 'strategy',  label: 'Strategy Agent',          detail: 'Re-mandate Request • 74%',           ts: '19:47:10', status: 'done' },
      { step: 'policy',    label: 'Policy Engine',           detail: 'Max retries reached — BLOCKED',       ts: '19:47:13', status: 'blocked' },
      { step: 'action',    label: 'Recovery Action',         detail: 'Blocked by policy',                   ts: null,       status: 'blocked' },
      { step: 'outcome',   label: 'Recovery Failed',         detail: 'Policy limit reached',                ts: '20:15:00', status: 'failed' },
    ],
  },
  {
    id: 'RC-10296', paymentId: 'pay_RC10296', customerId: 'cust_006',
    amount: 3400, currency: 'INR', riskScore: 55,
    rootCause: 'UNKNOWN', rootCauseConfidence: 62, rootCauseCategory: 'Unclassified',
    strategy: 'Manual Review', strategyRecoveryProbability: 45, expectedRecovery: 1530,
    status: 'escalated', priority: 'low',
    policyPassed: null, policyChecks: [],
    attempts: 0, maxAttempts: 1,
    actualRecovered: null, recoveryTime: null,
    createdAt: '2025-08-30T18:22:00Z', resolvedAt: null,
    timeline: [
      { step: 'detected',  label: 'Revenue Risk Detected',  detail: 'Payment failure identified',          ts: '18:22:03', status: 'done' },
      { step: 'detection', label: 'Detection Agent',         detail: 'Low confidence — escalated',          ts: '18:22:06', status: 'done' },
      { step: 'rootcause', label: 'Root Cause Agent',        detail: 'UNKNOWN • Low confidence 62%',        ts: '18:22:09', status: 'blocked' },
      { step: 'strategy',  label: 'Strategy Agent',          detail: 'Manual Review recommended',           ts: '18:22:11', status: 'done' },
      { step: 'policy',    label: 'Policy Engine',           detail: 'Escalated to merchant',               ts: null,       status: 'blocked' },
      { step: 'action',    label: 'Recovery Action',         detail: 'Awaiting merchant decision',          ts: null,       status: 'pending' },
      { step: 'outcome',   label: 'Outcome',                 detail: 'Pending',                             ts: null,       status: 'pending' },
    ],
  },
  {
    id: 'RC-10302', paymentId: 'pay_RC10302', customerId: 'cust_004',
    amount: 5700, currency: 'INR', riskScore: 70,
    rootCause: 'BANK_TIMEOUT', rootCauseConfidence: 89, rootCauseCategory: 'Temporary Gateway / Bank Failure',
    strategy: 'Delayed Retry', strategyRecoveryProbability: 88, expectedRecovery: 5016,
    status: 'recovered', priority: 'medium',
    policyPassed: true, policyChecks: [
      { label: 'Maximum retries', value: '1 / 3', passed: true },
      { label: 'Cooldown period', value: 'Passed', passed: true },
      { label: 'Amount limit',    value: 'Passed', passed: true },
      { label: 'Customer flags',  value: 'None',   passed: true },
    ],
    attempts: 1, maxAttempts: 3,
    actualRecovered: 5700, recoveryTime: 48,
    createdAt: '2025-08-29T13:11:00Z', resolvedAt: '2025-08-29T13:11:48Z',
    timeline: [
      { step: 'detected',  label: 'Revenue Risk Detected',  detail: 'Payment failure identified',          ts: '13:11:05', status: 'done' },
      { step: 'detection', label: 'Detection Agent',         detail: 'BANK_TIMEOUT pattern matched',        ts: '13:11:07', status: 'done' },
      { step: 'rootcause', label: 'Root Cause Agent',        detail: 'BANK_TIMEOUT • Confidence 89%',      ts: '13:11:11', status: 'done' },
      { step: 'strategy',  label: 'Strategy Agent',          detail: 'Delayed Retry • Probability 88%',    ts: '13:11:14', status: 'done' },
      { step: 'policy',    label: 'Policy Engine',           detail: '4 / 4 checks passed',               ts: '13:11:16', status: 'done' },
      { step: 'action',    label: 'Recovery Action',         detail: 'Retry executed',                     ts: '13:11:19', status: 'done' },
      { step: 'outcome',   label: 'Payment Recovered',       detail: '₹5,700 recovered in 48 seconds',    ts: '13:11:48', status: 'done' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// AI AGENTS
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_AGENTS = [
  {
    id: 'agent_detection',
    name: 'Detection Agent',
    description: 'Monitors payment events and identifies revenue at risk in real time.',
    status: 'online',
    currentTask: 'Analyzing RC-10294',
    tasksProcessed: 1284,
    successRate: 98.2,
    avgLatency: '0.8s',
    lastActivity: '2 min ago',
    type: 'detection',
  },
  {
    id: 'agent_rootcause',
    name: 'Root Cause Agent',
    description: 'Classifies failure reasons using ML-based pattern recognition.',
    status: 'processing',
    currentTask: 'RC-10294 — INSUFFICIENT_FUNDS',
    tasksProcessed: 1241,
    successRate: 94.7,
    avgLatency: '1.2s',
    lastActivity: 'Just now',
    type: 'rootcause',
  },
  {
    id: 'agent_strategy',
    name: 'Strategy Agent',
    description: 'Selects optimal recovery strategy based on failure type, customer profile, and history.',
    status: 'idle',
    currentTask: null,
    tasksProcessed: 1108,
    successRate: 91.3,
    avgLatency: '0.6s',
    lastActivity: '4 min ago',
    type: 'strategy',
  },
  {
    id: 'agent_learning',
    name: 'Learning Agent',
    description: 'Continuously improves recovery models from historical outcomes.',
    status: 'online',
    currentTask: 'Training on 14 new outcomes',
    tasksProcessed: 892,
    successRate: 99.1,
    avgLatency: '3.4s',
    lastActivity: '11 min ago',
    type: 'learning',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LIVE ACTIVITY  (for activity feed + dashboard)
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_LIVE_ACTIVITY = [
  { id: 'act_01', type: 'recovered',  ts: '23:41:31', message: '₹25,000 recovered', detail: 'RC-10291 — Delayed Retry succeeded', caseId: 'RC-10291' },
  { id: 'act_02', type: 'action',     ts: '23:41:19', message: 'Retry executing',    detail: 'RC-10291 — Attempt 1 of 3', caseId: 'RC-10291' },
  { id: 'act_03', type: 'policy',     ts: '23:41:13', message: 'Policy approved',    detail: 'RC-10291 — 4/4 checks passed', caseId: 'RC-10291' },
  { id: 'act_04', type: 'strategy',   ts: '23:41:10', message: 'Strategy selected', detail: 'RC-10291 — Delayed Retry (91%)', caseId: 'RC-10291' },
  { id: 'act_05', type: 'rootcause',  ts: '23:41:07', message: 'Root cause found',  detail: 'RC-10291 — BANK_TIMEOUT (94%)', caseId: 'RC-10291' },
  { id: 'act_06', type: 'detected',   ts: '23:41:02', message: 'Failure detected',  detail: 'RC-10291 — ₹25,000 at risk', caseId: 'RC-10291' },
  { id: 'act_07', type: 'recovered',  ts: '22:18:31', message: '₹5,700 recovered',  detail: 'RC-10302 — Delayed Retry succeeded', caseId: 'RC-10302' },
  { id: 'act_08', type: 'detected',   ts: '22:18:05', message: 'Failure detected',  detail: 'RC-10292 — ₹4,299 at risk', caseId: 'RC-10292' },
  { id: 'act_09', type: 'policy',     ts: '20:15:00', message: 'Policy blocked',    detail: 'RC-10295 — Max retries reached', caseId: 'RC-10295' },
  { id: 'act_10', type: 'detected',   ts: '19:47:02', message: 'Failure detected',  detail: 'RC-10295 — ₹8,800 at risk', caseId: 'RC-10295' },
];

// ─────────────────────────────────────────────────────────────────────────────
// RECOVERY FUNNEL  (dashboard visualization)
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_RECOVERY_FUNNEL = [
  { label: 'Revenue Events',       value: 1284, pct: 100  },
  { label: 'At Risk',              value: 312,  pct: 24.3 },
  { label: 'AI Qualified',         value: 221,  pct: 70.8 },
  { label: 'Recovery Attempted',   value: 168,  pct: 76.0 },
  { label: 'Successfully Recovered', value: 121, pct: 72.0 },
];

// ─────────────────────────────────────────────────────────────────────────────
// HIGH PRIORITY CASES  (dashboard widget)
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_HIGH_PRIORITY = MOCK_RECOVERY_CASES
  .filter(c => c.priority === 'high' && c.status !== 'recovered')
  .map(c => ({
    id: c.id,
    customer: MOCK_CUSTOMERS.find(cu => cu.id === c.customerId)?.name || 'Unknown',
    amount: c.amount,
    riskScore: c.riskScore,
    recoveryProbability: c.strategyRecoveryProbability,
    status: c.status,
  }));

// ─────────────────────────────────────────────────────────────────────────────
// AGENT ACTIVITY LOG
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_AGENT_ACTIVITY = [
  { agentId: 'agent_detection', caseId: 'RC-10294', action: 'Analyzing payment failure', ts: 'Just now', status: 'processing' },
  { agentId: 'agent_rootcause', caseId: 'RC-10294', action: 'Classifying root cause', ts: '1 min ago', status: 'processing' },
  { agentId: 'agent_strategy',  caseId: 'RC-10293', action: 'Recommendation generated', ts: '3 min ago', status: 'done' },
  { agentId: 'agent_detection', caseId: 'RC-10291', action: 'Detection complete', ts: '11 min ago', status: 'done' },
  { agentId: 'agent_learning',  caseId: null,        action: 'Model update complete', ts: '18 min ago', status: 'done' },
];

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS — Revenue Metrics
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_ANALYTICS_METRICS = {
  totalRevenueProcessed: 42800000,  // ₹42.8L (paise)
  revenueAtRisk:         8420000,   // ₹8.42L
  expectedRecovery:      6310000,   // ₹6.31L
  actualRecovered:       2140000,   // ₹2.14L
  recoveryRate:          74.9,      // %
  revenueSaved:          2140000,   // ₹2.14L
  recoveryRealization:   33.9,      // actual/expected %
  // deltas vs previous period
  totalProcessedDelta: 8.3,
  atRiskDelta: 12.4,
  expectedDelta: 9.1,
  recoveredDelta: 18.7,
  recoveryRateDelta: 4.1,
  savedDelta: 18.7,
};

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS — Recovery Rate Over Time (7D)
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_RECOVERY_RATE_DATA = {
  '7D': [
    { label: 'Mon', current: 68.2, previous: 61.1 },
    { label: 'Tue', current: 71.4, previous: 64.8 },
    { label: 'Wed', current: 76.1, previous: 68.2 },
    { label: 'Thu', current: 72.8, previous: 65.9 },
    { label: 'Fri', current: 74.9, previous: 67.3 },
    { label: 'Sat', current: 78.3, previous: 71.0 },
    { label: 'Sun', current: 75.2, previous: 69.4 },
  ],
  '30D': Array.from({ length: 30 }, (_, i) => ({
    label: `D${i + 1}`,
    current: 60 + Math.sin(i * 0.3) * 12 + i * 0.4,
    previous: 55 + Math.sin(i * 0.3) * 10 + i * 0.3,
  })),
  '90D': Array.from({ length: 12 }, (_, i) => ({
    label: `W${i + 1}`,
    current: 62 + Math.sin(i * 0.5) * 10 + i * 0.8,
    previous: 56 + Math.sin(i * 0.5) * 9 + i * 0.6,
  })),
};

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS — Strategy Performance
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_STRATEGY_PERFORMANCE = [
  { strategy: 'Delayed Retry',      attempts: 84, recovered: 320000, successRate: 78.5, avgTime: '42s' },
  { strategy: 'Payment Reminder',   attempts: 62, recovered: 140000, successRate: 65.2, avgTime: '4h 12m' },
  { strategy: 'Method Change',      attempts: 31, recovered: 92000,  successRate: 71.4, avgTime: '1m 18s' },
  { strategy: 'Escalation',         attempts: 18, recovered: 44000,  successRate: 55.6, avgTime: '24h' },
  { strategy: 'SMS Nudge + UPI',    attempts: 27, recovered: 88000,  successRate: 66.7, avgTime: '2h 30m' },
  { strategy: 'Alt Payment Link',   attempts: 14, recovered: 61500,  successRate: 71.4, avgTime: '6h' },
];

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS — Revenue Leakage Breakdown
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_REVENUE_BREAKDOWN = [
  { category: 'Payment Failures',       amount: 420000, pct: 49.9, color: '#ef4444' },
  { category: 'Checkout Abandonment',   amount: 180000, pct: 21.4, color: '#f97316' },
  { category: 'Failed Subscriptions',   amount: 150000, pct: 17.8, color: '#eab308' },
  { category: 'Overdue Invoices',       amount: 92000,  pct: 10.9, color: '#8b5cf6' },
];

// ─────────────────────────────────────────────────────────────────────────────
// ANALYTICS — AI Effectiveness
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_AI_EFFECTIVENESS = {
  aiQualifiedCases:    221,
  successfulStrategies: 168,
  aiSuccessRate:       76.0,
  avgDecisionTimeSec:  4.2,
  revenueRecovered:    214000,
  agentAccuracy: [
    { agent: 'Detection Agent',  accuracy: 98.2, icon: 'Search' },
    { agent: 'Root Cause Agent', accuracy: 94.8, icon: 'Microscope' },
    { agent: 'Strategy Agent',   accuracy: 91.4, icon: 'Lightbulb' },
    { agent: 'Learning Agent',   accuracy: 99.1, icon: 'Brain' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// POLICIES
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_POLICY_OVERVIEW = {
  activePolicies:    8,
  actionsRestricted: 3,
  pendingReview:     2,
  violationsToday:   0,
};

export const MOCK_POLICY_CATEGORIES = [
  { id: 'retry',        label: 'Retry Policy',          icon: 'RefreshCcw',  status: 'active', rules: 5, updatedAt: 'Today' },
  { id: 'amount',       label: 'Amount Limits',          icon: 'DollarSign',  status: 'active', rules: 3, updatedAt: 'Today' },
  { id: 'customer',     label: 'Customer Protection',    icon: 'UserShield',  status: 'active', rules: 4, updatedAt: '2 days ago' },
  { id: 'cooldown',     label: 'Cooldown Rules',         icon: 'Clock',       status: 'active', rules: 2, updatedAt: 'Today' },
  { id: 'escalation',   label: 'Escalation Rules',       icon: 'AlertTriangle', status: 'active', rules: 6, updatedAt: '3 days ago' },
  { id: 'time',         label: 'Time Restrictions',      icon: 'Timer',       status: 'active', rules: 2, updatedAt: '1 week ago' },
  { id: 'subscription', label: 'Subscription Recovery',  icon: 'Repeat',      status: 'active', rules: 4, updatedAt: '2 days ago' },
  { id: 'invoice',      label: 'Invoice Recovery',       icon: 'FileText',    status: 'active', rules: 3, updatedAt: '5 days ago' },
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
// AUDIT LOGS
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

export const MOCK_AUDIT_LOGS = [
  {
    id: 'audit_001',
    timestamp: '2025-08-30T23:41:31Z',
    eventType: 'PAYMENT_RECOVERED',
    actor: 'Action Service',
    caseId: 'RC-10291',
    action: 'Retry',
    result: 'SUCCESS',
    detail: '₹25,000 recovered',
    prevState: 'executing',
    newState: 'recovered',
    decision: 'Retry executed — payment processed successfully',
    reason: 'Delayed retry after BANK_TIMEOUT resolved',
    metadata: { retryAttempt: 1, amount: 25000, recoveryProbability: 0.91, method: 'CARD', gateway: 'Razorpay' },
  },
  {
    id: 'audit_002',
    timestamp: '2025-08-30T23:41:13Z',
    eventType: 'POLICY_APPROVED',
    actor: 'Policy Engine',
    caseId: 'RC-10291',
    action: 'Retry',
    result: 'APPROVED',
    detail: 'Within limits',
    prevState: 'strategy_selected',
    newState: 'policy_passed',
    decision: 'Automatic action approved',
    reason: 'All 4 policy checks passed',
    metadata: { checksRun: 4, checksPassed: 4, maxRetriesCheck: true, cooldownCheck: true, amountCheck: true, customerCheck: true },
  },
  {
    id: 'audit_003',
    timestamp: '2025-08-30T23:41:10Z',
    eventType: 'STRATEGY_SELECTED',
    actor: 'Strategy Agent',
    caseId: 'RC-10291',
    action: 'Delayed Retry',
    result: 'SUCCESS',
    detail: '91% probability',
    prevState: 'root_cause_identified',
    newState: 'strategy_selected',
    decision: 'Delayed Retry selected as optimal strategy',
    reason: 'BANK_TIMEOUT failures resolve within 30m with 91% success rate historically',
    metadata: { strategy: 'Delayed Retry', recoveryProbability: 0.91, alternativesConsidered: ['Immediate Retry', 'Payment Reminder'], rootCause: 'BANK_TIMEOUT' },
  },
  {
    id: 'audit_004',
    timestamp: '2025-08-30T23:41:07Z',
    eventType: 'ROOT_CAUSE_IDENTIFIED',
    actor: 'Root Cause Agent',
    caseId: 'RC-10291',
    action: 'Classification',
    result: 'SUCCESS',
    detail: 'BANK_TIMEOUT (94%)',
    prevState: 'risk_detected',
    newState: 'root_cause_identified',
    decision: 'BANK_TIMEOUT classified with high confidence',
    reason: 'Pattern matches 94% confidence threshold for gateway timeout',
    metadata: { rootCause: 'BANK_TIMEOUT', confidence: 0.94, category: 'Temporary Gateway / Bank Failure', signalsAnalyzed: 12 },
  },
  {
    id: 'audit_005',
    timestamp: '2025-08-30T23:41:02Z',
    eventType: 'RISK_DETECTED',
    actor: 'Detection Agent',
    caseId: 'RC-10291',
    action: 'Detection',
    result: 'SUCCESS',
    detail: '₹25,000 at risk',
    prevState: null,
    newState: 'risk_detected',
    decision: 'Recovery case created for failed payment',
    reason: 'Payment failure detected — amount exceeds ₹1,000 threshold',
    metadata: { paymentId: 'pay_RC10291', amount: 25000, failureCode: 'BANK_TIMEOUT', riskScore: 91 },
  },
  {
    id: 'audit_006',
    timestamp: '2025-08-30T23:41:00Z',
    eventType: 'PAYMENT_FAILED',
    actor: 'Payment Gateway',
    caseId: 'RC-10291',
    action: 'Payment Attempt',
    result: 'FAILED',
    detail: 'BANK_TIMEOUT',
    prevState: null,
    newState: 'failed',
    decision: 'Payment failure event received',
    reason: 'Gateway returned BANK_TIMEOUT error code',
    metadata: { paymentId: 'pay_RC10291', amount: 25000, currency: 'INR', gateway: 'Razorpay', errorCode: 'BANK_TIMEOUT' },
  },
  {
    id: 'audit_007',
    timestamp: '2025-08-30T20:15:00Z',
    eventType: 'CASE_STOPPED',
    actor: 'Policy Engine',
    caseId: 'RC-10295',
    action: 'Stop',
    result: 'BLOCKED',
    detail: 'Max retries reached',
    prevState: 'executing',
    newState: 'failed',
    decision: 'Recovery stopped — maximum retry limit reached',
    reason: 'Policy rule: stop_after_max_attempts triggered after 3/3 attempts',
    metadata: { attemptsUsed: 3, maxAttempts: 3, policyRule: 'stop_after_max_attempts', finalStatus: 'unrecovered' },
  },
  {
    id: 'audit_008',
    timestamp: '2025-08-30T19:47:13Z',
    eventType: 'POLICY_BLOCKED',
    actor: 'Policy Engine',
    caseId: 'RC-10295',
    action: 'Re-mandate Request',
    result: 'BLOCKED',
    detail: 'Retry limit exceeded',
    prevState: 'strategy_selected',
    newState: 'policy_blocked',
    decision: 'Action blocked by policy',
    reason: 'Maximum retry attempts (3/3) already exhausted',
    metadata: { checksRun: 4, checksPassed: 3, checksFailed: 1, failedCheck: 'max_retries', retriesUsed: 3, maxRetries: 3 },
  },
  {
    id: 'audit_009',
    timestamp: '2025-08-30T22:18:21Z',
    eventType: 'ACTION_STARTED',
    actor: 'Action Service',
    caseId: 'RC-10292',
    action: 'Recovery Email',
    result: 'SUCCESS',
    detail: 'Email dispatched',
    prevState: 'policy_passed',
    newState: 'executing',
    decision: 'Recovery email sent to customer',
    reason: 'NETWORK_ERROR — Recovery Email strategy authorized by policy',
    metadata: { emailTemplate: 'recovery_nudge_v2', recipientEmail: 'ananya.i@example.com', estimatedDelivery: '2025-08-30T22:19:00Z' },
  },
  {
    id: 'audit_010',
    timestamp: '2025-08-30T18:22:11Z',
    eventType: 'CASE_ESCALATED',
    actor: 'Strategy Agent',
    caseId: 'RC-10296',
    action: 'Manual Review',
    result: 'ESCALATED',
    detail: 'Low confidence',
    prevState: 'root_cause_identified',
    newState: 'escalated',
    decision: 'Case escalated to merchant for manual review',
    reason: 'AI confidence below 70% threshold — root cause UNKNOWN',
    metadata: { rootCause: 'UNKNOWN', confidence: 0.62, escalationReason: 'low_confidence', assignedTo: 'merchant_001' },
  },
  {
    id: 'audit_011',
    timestamp: '2025-08-29T13:11:48Z',
    eventType: 'PAYMENT_RECOVERED',
    actor: 'Action Service',
    caseId: 'RC-10302',
    action: 'Retry',
    result: 'SUCCESS',
    detail: '₹5,700 recovered',
    prevState: 'executing',
    newState: 'recovered',
    decision: 'Retry executed — payment processed successfully',
    reason: 'Delayed retry after BANK_TIMEOUT resolved',
    metadata: { retryAttempt: 1, amount: 5700, recoveryProbability: 0.88, method: 'UPI' },
  },
  {
    id: 'audit_012',
    timestamp: '2025-08-29T13:11:16Z',
    eventType: 'POLICY_APPROVED',
    actor: 'Policy Engine',
    caseId: 'RC-10302',
    action: 'Retry',
    result: 'APPROVED',
    detail: 'Within limits',
    prevState: 'strategy_selected',
    newState: 'policy_passed',
    decision: 'Automatic action approved',
    reason: 'All 4 policy checks passed',
    metadata: { checksRun: 4, checksPassed: 4 },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────────────────────────────────────
export const MOCK_NOTIFICATIONS = [
  {
    id: 'notif_001',
    category: 'Recovery',
    title: 'Recovery Successful',
    message: '₹25,000 recovered from RC-10291 via Delayed Retry',
    timestamp: '2025-08-30T23:41:31Z',
    read: false,
    caseId: 'RC-10291',
    severity: 'success',
  },
  {
    id: 'notif_002',
    category: 'Policy',
    title: 'Policy Blocked Action',
    message: 'Automatic retry blocked for RC-10295 — max retries reached',
    timestamp: '2025-08-30T20:15:00Z',
    read: false,
    caseId: 'RC-10295',
    severity: 'warning',
  },
  {
    id: 'notif_003',
    category: 'AI Agent',
    title: 'Strategy Agent Update',
    message: 'Strategy Agent processed 12 new cases with 91.4% accuracy',
    timestamp: '2025-08-30T20:00:00Z',
    read: false,
    caseId: null,
    severity: 'info',
  },
  {
    id: 'notif_004',
    category: 'Recovery',
    title: 'Case Escalated',
    message: 'RC-10296 escalated to manual review — low AI confidence (62%)',
    timestamp: '2025-08-30T18:22:11Z',
    read: true,
    caseId: 'RC-10296',
    severity: 'warning',
  },
  {
    id: 'notif_005',
    category: 'System',
    title: 'Learning Agent Update',
    message: 'Recovery models updated with 14 new outcomes — accuracy improved 0.3%',
    timestamp: '2025-08-30T17:30:00Z',
    read: true,
    caseId: null,
    severity: 'info',
  },
  {
    id: 'notif_006',
    category: 'Recovery',
    title: 'Recovery Successful',
    message: '₹5,700 recovered from RC-10302 via Delayed Retry',
    timestamp: '2025-08-29T13:11:48Z',
    read: true,
    caseId: 'RC-10302',
    severity: 'success',
  },
];

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
