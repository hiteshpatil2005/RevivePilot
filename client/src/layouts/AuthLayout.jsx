import { Navigate, Outlet } from 'react-router-dom';
import Logo from '../components/common/Logo';
import ThemeToggle from '../components/common/ThemeToggle';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/common/Spinner';

/**
 * AuthLayout
 *
 * Two-column layout on desktop:
 *   Left  — brand panel with tagline and stats
 *   Right — auth form (Login / Register via Outlet)
 *
 * Collapses to single column on mobile.
 * Already-authenticated users are redirected to /dashboard.
 */
export default function AuthLayout() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-screen"
        style={{ backgroundColor: 'var(--color-bg-page)' }}
      >
        <Spinner size={28} />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ backgroundColor: 'var(--color-bg-page)' }}
    >
      {/* ── Brand Panel (left, hidden on mobile) ── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 p-12"
        style={{
          backgroundColor: 'var(--color-bg-card)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {/* Top: Logo */}
        <Logo variant="full" size="lg" />

        {/* Middle: Tagline */}
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-widest mb-4"
            style={{ color: 'var(--color-brand)' }}
          >
            Track 03 — AI Revenue Recovery
          </p>
          <h2
            className="text-4xl font-bold leading-tight mb-4"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Detect.<br />Decide.<br />Recover.
          </h2>
          <p
            className="text-[15px] leading-relaxed"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            RevivePilot autonomously identifies revenue at risk, selects the optimal recovery strategy, and executes bounded AI actions — all within your merchant policy guardrails.
          </p>

          {/* Feature points */}
          <div className="mt-10 space-y-4">
            {[
              { label: 'Autonomous Agents', desc: 'AI agents that act, not just report' },
              { label: 'Policy-Controlled', desc: 'Every action stays within your rules' },
              { label: 'Real-Time Recovery', desc: 'Sub-minute failure detection & response' },
            ].map(f => (
              <div key={f.label} className="flex items-start gap-3">
                <div
                  className="mt-0.5 w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: 'var(--color-brand)', marginTop: '6px' }}
                />
                <div>
                  <p
                    className="text-[13px] font-semibold"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {f.label}
                  </p>
                  <p
                    className="text-[12px]"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Stats strip */}
        <div
          className="flex gap-8 pt-8"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          {[
            { value: '69.5%', label: 'Avg. Recovery Rate' },
            { value: '<8m',   label: 'Avg. Response Time' },
            { value: '4',     label: 'AI Agents' },
          ].map(s => (
            <div key={s.label}>
              <p
                className="text-2xl font-bold font-mono-data"
                style={{ color: 'var(--color-brand)' }}
              >
                {s.value}
              </p>
              <p
                className="text-[11px] mt-0.5"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Auth Content Panel (right) ── */}
      <div className="flex-1 flex flex-col">
        {/* Top bar with theme toggle */}
        <div
          className="flex items-center justify-between px-6 py-4 lg:justify-end"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          {/* Logo visible only on mobile */}
          <div className="lg:hidden">
            <Logo variant="full" size="sm" />
          </div>
          <ThemeToggle />
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md animate-fade-in">
            <Outlet />
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 text-center"
          style={{ borderTop: '1px solid var(--color-border)' }}
        >
          <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
            © 2025 RevivePilot · Built for Razorpay Buildathon Track 03
          </p>
        </div>
      </div>
    </div>
  );
}
