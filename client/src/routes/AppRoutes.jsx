import { Routes, Route, Navigate } from 'react-router-dom';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from './ProtectedRoute';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import Dashboard from '../pages/dashboard/Dashboard';

/**
 * AppRoutes — single source of truth for all client routes.
 *
 * Route tree:
 *   /             → redirect to /login
 *   /login        → AuthLayout → Login
 *   /register     → AuthLayout → Register
 *   /dashboard    → ProtectedRoute → DashboardLayout → Dashboard
 *   /recovery     → ProtectedRoute → DashboardLayout → (coming in Part 2)
 *   /agents       → ProtectedRoute → DashboardLayout → (coming in Part 3)
 *   /transactions → ProtectedRoute → DashboardLayout → (coming in Part 2)
 *   /analytics    → ProtectedRoute → DashboardLayout → (coming in Part 4)
 *   /policies     → ProtectedRoute → DashboardLayout → (coming in Part 3)
 *   /audit        → ProtectedRoute → DashboardLayout → (coming in Part 4)
 *   *             → redirect to /login
 */
function ComingSoon({ page }) {
  return (
    <div className="flex items-center justify-center h-full p-12">
      <div className="text-center">
        <p
          className="text-4xl font-bold mb-3"
          style={{ color: 'var(--color-border-strong)' }}
        >
          🚧
        </p>
        <p className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {page}
        </p>
        <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Coming in the next development phase
        </p>
      </div>
    </div>
  );
}

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
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/recovery"     element={<ComingSoon page="Recovery Cases" />} />
          <Route path="/agents"       element={<ComingSoon page="AI Agents" />} />
          <Route path="/transactions" element={<ComingSoon page="Transactions" />} />
          <Route path="/analytics"    element={<ComingSoon page="Analytics" />} />
          <Route path="/policies"     element={<ComingSoon page="Policies" />} />
          <Route path="/audit"        element={<ComingSoon page="Audit Logs" />} />
        </Route>
      </Route>

      {/* 404 catch-all */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
