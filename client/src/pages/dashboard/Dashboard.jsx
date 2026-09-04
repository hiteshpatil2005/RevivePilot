import { useNavigate } from 'react-router-dom';
import {
  TrendingDown, TrendingUp, RefreshCcw, Activity,
  ArrowUpRight, AlertTriangle, ExternalLink, ArrowRight, ShieldCheck, Zap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDashboard } from '../../hooks/useDashboard';
import { useRecoveryCases } from '../../hooks/useRecoveryCases';
import StatusBadge from '../../components/common/StatusBadge';
import RiskBadge from '../../components/common/RiskBadge';
import SkeletonLoader from '../../components/common/SkeletonLoader';
import RevenueRecoveryChart from '../../components/dashboard/RevenueRecoveryChart';
import RecoveryFunnel from '../../components/dashboard/RecoveryFunnel';
import LiveRecoveryActivity from '../../components/dashboard/LiveRecoveryActivity';
import LiveIndicator from '../../components/common/LiveIndicator';

const LAKHS = (n) => {
  if (n === undefined || n === null) return '—';
  const l = n / 10000000;
  return l >= 1 ? `₹${l.toFixed(2)}L` : `₹${(n / 100).toLocaleString('en-IN')}`;
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { metrics, loading } = useDashboard();
  const { cases } = useRecoveryCases();

  const recentCases = (cases || []).slice(0, 5);
  const highPriorityCases = (cases || []).filter(
    (c) => c.priority === 'high' || (c.riskScore ?? c.risk_score ?? 0) >= 80
  );

  const kpis = metrics
    ? [
        {
          label: 'Revenue at Risk',
          value: LAKHS(metrics.revenueAtRisk ?? 0),
          sub: 'Across active failure events',
          delta: metrics.revenueAtRiskDelta ?? 0,
          deltaLabel: 'vs previous period',
          icon: TrendingDown,
          color: '#ef4444',
          bgTint: 'rgba(239, 68, 68, 0.08)',
        },
        {
          label: 'Expected Recovery',
          value: LAKHS(metrics.expectedRecovery ?? 0),
          sub: `${metrics.recoveryRate ?? 0}% recovery probability`,
          delta: metrics.recoveryRateDelta ?? 0,
          deltaLabel: 'rate improvement',
          icon: TrendingUp,
          color: '#0c6ff9',
          bgTint: 'rgba(12, 111, 249, 0.08)',
        },
        {
          label: 'Recovered Revenue',
          value: LAKHS(metrics.recoveredRevenue ?? 0),
          sub: 'Successfully captured to account',
          delta: metrics.recoveredDelta ?? 0,
          deltaLabel: 'vs previous period',
          icon: TrendingUp,
          color: '#10b981',
          bgTint: 'rgba(16, 185, 129, 0.08)',
        },
        {
          label: 'Active Recovery Cases',
          value: metrics.activeCases ?? 0,
          sub: `${metrics.highPriorityCases ?? 0} critical in queue`,
          icon: Activity,
          color: '#f59e0b',
          bgTint: 'rgba(245, 158, 11, 0.08)',
        },
        {
          label: 'Avg Recovery Speed',
          value: metrics.avgRecoveryTime || '0s',
          sub: 'Detection to settlement',
          icon: RefreshCcw,
          color: '#0891b2',
          bgTint: 'rgba(8, 145, 178, 0.08)',
        },
      ]
    : [];

  return (
    <div className="w-full max-w-[1720px] px-6 lg:px-10 py-7 space-y-7 mx-auto text-slate-900 font-sans">
      {/* ── Enterprise Header (High contrast, 100% visible, professional fintech branding) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Revenue Recovery Dashboard
            </h1>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-[#0c6ff9] border border-blue-200">
              Enterprise Cockpit
            </span>
          </div>
          <p className="text-sm text-slate-600">
            Real-time autonomous monitoring and payment gateway recovery telemetry
          </p>
          <p className="text-xs text-slate-500 font-medium">
            Tenant: <strong className="text-slate-800">{user?.businessName || user?.business_name || 'RevivePilot Enterprise'}</strong> · Region: <strong className="text-slate-800">ap-south-1 (Mumbai)</strong> · Node: <strong className="text-slate-800">Active</strong>
          </p>
        </div>

        {/* Clean, horizontally-aligned action toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Customer Store Direct Link */}
          <a
            href="http://localhost:5174"
            target="_blank"
            rel="noreferrer"
            className="h-9 px-4 rounded text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-[#0c6ff9] hover:border-[#0c6ff9] flex items-center gap-2 transition-all shadow-2xs"
            title="Open customer checkout simulation portal on port 5174"
          >
            <ExternalLink size={14} className="text-[#0c6ff9]" />
            <span>Customer Store (:5174)</span>
          </a>

          {/* Primary Recovery Center Shortcut */}
          <button
            type="button"
            onClick={() => navigate('/recovery')}
            className="h-9 px-4 rounded text-xs font-bold bg-[#0c6ff9] hover:bg-[#005ad4] text-white flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <span>Recovery Center</span>
            <ArrowRight size={14} />
          </button>

          {/* Live Engine Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-slate-100 border border-slate-200">
            <LiveIndicator />
            <span className="text-xs font-semibold text-slate-700">
              Live Engine
            </span>
          </div>
        </div>
      </div>

      {/* ── Expanded 5-Column KPI Metric Cards (Pure white background, clean contrast) ── */}
      {loading ? (
        <SkeletonLoader.MetricGrid count={5} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {kpis.map((k) => {
            const Icon = k.icon;
            const isPositive = k.delta != null && k.delta > 0;
            const isNegative = k.delta != null && k.delta < 0;

            return (
              <div
                key={k.label}
                className="p-5 rounded-lg bg-white border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {k.label}
                  </span>
                  <div
                    className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: k.bgTint }}
                  >
                    <Icon size={16} style={{ color: k.color }} />
                  </div>
                </div>

                <div className="my-3">
                  <p className="text-3xl font-extrabold font-mono text-slate-900 tracking-tight leading-none">
                    {k.value}
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5 font-medium truncate">
                    {k.sub}
                  </p>
                </div>

                {k.delta != null ? (
                  <div className="flex items-center gap-1.5 text-xs font-semibold pt-3 border-t border-slate-100">
                    {isPositive && <TrendingUp size={14} className="text-emerald-600" />}
                    {isNegative && <TrendingDown size={14} className="text-red-600" />}
                    <span className={isPositive ? 'text-emerald-700' : isNegative ? 'text-red-700' : 'text-slate-500'}>
                      {k.delta > 0 ? '+' : ''}{k.delta}% {k.deltaLabel}
                    </span>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-slate-100 text-xs text-slate-400 font-medium">
                    Continuous monitoring
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Expanded Analytics Row (Chart + Funnel) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg shadow-2xs p-1">
          <RevenueRecoveryChart />
        </div>
        <div className="bg-white border border-slate-200 rounded-lg shadow-2xs p-1">
          <RecoveryFunnel metrics={metrics} />
        </div>
      </div>

      {/* ── Expanded Operations Row (Pure White Recent Recovery Table + Critical Alerts) ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left (2 cols): Recent Recovery Operations Table with 100% White Background */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Recent Recovery Operations
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Live autonomous intervention and state transitions across payment gateways
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/recovery')}
              className="text-xs font-bold text-[#0c6ff9] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View all cases</span>
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="overflow-x-auto bg-white">
            <table className="w-full text-left text-xs bg-white">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Case ID</th>
                  <th className="px-6 py-3.5">Customer</th>
                  <th className="px-6 py-3.5">Amount</th>
                  <th className="px-6 py-3.5">Risk Band</th>
                  <th className="px-6 py-3.5">Recommended Strategy</th>
                  <th className="px-6 py-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {recentCases.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-500 text-xs bg-white">
                      No active recovery cases logged.
                    </td>
                  </tr>
                ) : (
                  recentCases.map((c) => {
                    const customerName = c.customer?.name || c.customer_name || c.customerName || 'Customer';
                    const customerEmail = c.customer?.email || c.customer_email || c.customerEmail || '—';
                    const amountVal = Number(c.amount || c.expected_recovery_amount || 0);
                    return (
                      <tr
                        key={c.id}
                        onClick={() => navigate(`/recovery/${c.id}`)}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors bg-white"
                      >
                        <td className="px-6 py-4 font-mono font-bold text-[#0c6ff9]">
                          {c.id}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900">
                            {customerName}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {customerEmail}
                          </p>
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-slate-900 text-sm">
                          ₹{amountVal.toLocaleString('en-IN')}.00
                        </td>
                        <td className="px-6 py-4">
                          <RiskBadge score={c.riskScore ?? c.risk_score ?? 0} />
                        </td>
                        <td className="px-6 py-4 text-slate-800 font-medium">
                          {c.strategy || c.recommended_strategy || 'Smart Routing'}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={c.status} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right (1 col): Critical Escalation Queue & Live Telemetry Feed */}
        <div className="space-y-6">
          {/* Critical Escalation Queue (100% White Background) */}
          {highPriorityCases.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-200 bg-red-50/60">
                <AlertTriangle size={15} className="text-red-600 flex-shrink-0" />
                <h3 className="text-xs font-bold text-red-900 uppercase tracking-wider">
                  Critical Escalation Queue
                </h3>
              </div>

              <div className="divide-y divide-slate-100 bg-white">
                {highPriorityCases.slice(0, 3).map((c) => {
                  const cName = c.customer?.name || c.customer_name || c.customerName || 'Customer';
                  const cAmt = Number(c.amount || c.expected_recovery_amount || 0);
                  const risk = c.riskScore ?? c.risk_score ?? 0;
                  const recProb = c.recoveryProbability ?? c.recovery_probability ?? 0;
                  return (
                    <div
                      key={c.id}
                      onClick={() => navigate(`/recovery/${c.id}`)}
                      className="p-4 hover:bg-slate-50/80 cursor-pointer transition-colors text-xs bg-white"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-900 text-sm">{cName}</span>
                        <span className="font-mono font-bold text-red-600 text-sm">
                          ₹{cAmt.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mt-1">
                        <span>Risk: <strong className="text-slate-700">{risk}%</strong> · Recovery: <strong className="text-emerald-700">{recProb}%</strong></span>
                        <StatusBadge status={c.status} size="sm" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Live Activity Stream */}
          <div className="bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
            <LiveRecoveryActivity />
          </div>
        </div>
      </div>
    </div>
  );
}
