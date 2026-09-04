import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from './ProtectedRoute';

// Auth pages
import Login from '../pages/auth/Login';

// Dashboard pages (Part 1+2)
import Dashboard from '../pages/dashboard/Dashboard';
import RecoveryCases from '../pages/recovery/RecoveryCases';
import RecoveryCaseDetails from '../pages/recovery/RecoveryCaseDetails';
import AgentMonitor from '../pages/agents/AgentMonitor';
import Transactions from '../pages/transactions/Transactions';

// Operational pages (Part 3)
import Analytics from '../pages/analytics/Analytics';
import Policies from '../pages/policies/Policies';
import AuditLogs from '../pages/audit/AuditLogs';

// Integration pages (Part 4)
import TestPayment from '../pages/payments/TestPayment';

/**
 * AppRoutes — single source of truth for all client routes.
 *
 * Route tree:
 *   /                      → /login
 *   /login                 → AuthLayout → Login
 *   /register              → AuthLayout → Register
 *   /dashboard             → ProtectedRoute → DashboardLayout → Dashboard
 *   /recovery              → ProtectedRoute → DashboardLayout → RecoveryCases
 *   /recovery/:caseId      → ProtectedRoute → DashboardLayout → RecoveryCaseDetails
 *   /agents                → ProtectedRoute → DashboardLayout → AgentMonitor
 *   /transactions          → ProtectedRoute → DashboardLayout → Transactions
 *   /analytics             → ProtectedRoute → DashboardLayout → Analytics       [Part 3]
 *   /policies              → ProtectedRoute → DashboardLayout → Policies        [Part 3]
 *   /audit-logs            → ProtectedRoute → DashboardLayout → AuditLogs       [Part 3]
 *   /test-payment          → ProtectedRoute → DashboardLayout → TestPayment      [Part 4]
 *   *                      → /login
 */
export default function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
      </Route>

      {/* Protected dashboard routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          {/* Part 1+2 */}
          <Route path="/dashboard"         element={<Dashboard />} />
          <Route path="/recovery"          element={<RecoveryCases />} />
          <Route path="/recovery/:caseId"  element={<RecoveryCaseDetails />} />
          <Route path="/agents"            element={<AgentMonitor />} />
          <Route path="/transactions"      element={<Transactions />} />

          {/* Part 3 */}
          <Route path="/analytics"         element={<Analytics />} />
          <Route path="/policies"          element={<Policies />} />
          <Route path="/audit-logs"        element={<AuditLogs />} />

          {/* Part 4 */}
          <Route path="/test-payment"      element={<TestPayment />} />
        </Route>
      </Route>

      {/* 404 catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
