import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from './ProtectedRoute';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import Dashboard from '../pages/dashboard/Dashboard';
import RecoveryCases from '../pages/recovery/RecoveryCases';
import RecoveryCaseDetails from '../pages/recovery/RecoveryCaseDetails';
import AgentMonitor from '../pages/agents/AgentMonitor';
import Transactions from '../pages/transactions/Transactions';

/**
 * ComingSoon — placeholder for Part 3/4 pages still under development.
 */
function ComingSoon({ page }) {
  return (
    <div className="flex items-center justify-center h-full p-12">
      <div className="text-center">
        <p className="text-4xl mb-3">🚧</p>
        <p className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>{page}</p>
        <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Coming in the next development phase
        </p>
      </div>
    </div>
  );
}

/**
 * AppRoutes — single source of truth for all client routes.
 *
 * Route tree:
 *   /                      → /login
 *   /login                 → AuthLayout → Login
 *   /register              → AuthLayout → Register
 *   /dashboard             → ProtectedRoute → DashboardLayout → Dashboard        [Part 1+2]
 *   /recovery              → ProtectedRoute → DashboardLayout → RecoveryCases    [Part 2]
 *   /recovery/:caseId      → ProtectedRoute → DashboardLayout → RecoveryCaseDetails [Part 2]
 *   /agents                → ProtectedRoute → DashboardLayout → AgentMonitor     [Part 2]
 *   /transactions          → ProtectedRoute → DashboardLayout → Transactions     [Part 2]
 *   /analytics             → ProtectedRoute → DashboardLayout → ComingSoon       [Part 4]
 *   /policies              → ProtectedRoute → DashboardLayout → ComingSoon       [Part 3]
 *   /audit                 → ProtectedRoute → DashboardLayout → ComingSoon       [Part 4]
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
        <Route path="/register" element={<Register />} />
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
          {/* Part 3/4 */}
          <Route path="/analytics"         element={<ComingSoon page="Analytics" />} />
          <Route path="/policies"          element={<ComingSoon page="Policies" />} />
          <Route path="/audit"             element={<ComingSoon page="Audit Logs" />} />
        </Route>
      </Route>

      {/* 404 catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
