import { useNavigate } from 'react-router-dom';
import {
  TrendingDown, TrendingUp, RefreshCcw, Activity,
  ArrowUpRight, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import {
  MOCK_DASHBOARD_METRICS, MOCK_RECOVERY_CASES,
  MOCK_HIGH_PRIORITY, MOCK_CUSTOMERS,
} from '../../data/mockData';
import MetricCard from '../../components/common/MetricCard';
import StatusBadge from '../../components/common/StatusBadge';
import RiskBadge from '../../components/common/RiskBadge';
import RevenueRecoveryChart from '../../components/dashboard/RevenueRecoveryChart';
import RecoveryFunnel from '../../components/dashboard/RecoveryFunnel';
import LiveRecoveryActivity from '../../components/dashboard/LiveRecoveryActivity';
import LiveIndicator from '../../components/common/LiveIndicator';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const INR = n => `₹${(n / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const LAKHS = n => {
  const l = n / 10000000;
  return l >= 1 ? `₹${l.toFixed(2)}L` : `₹${(n / 100).toLocaleString('en-IN')}`;
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const m = MOCK_DASHBOARD_METRICS;
  const recentCases = MOCK_RECOVERY_CASES.slice(0, 5);

  const kpis = [
    {
      label: 'Revenue at Risk',
      value: LAKHS(m.revenueAtRisk),
      sub: 'Across active failure events',
      delta: m.revenueAtRiskDelta,
      deltaLabel: 'vs previous period',
      icon: TrendingDown,
      iconColor: 'var(--color-danger)',
    },
    {
      label: 'Expected Recovery',
      value: LAKHS(m.expectedRecovery),
      sub: `${m.recoveryRate}% recovery rate`,
      delta: m.recoveryRateDelta,
      deltaLabel: 'rate improvement',
      icon: TrendingUp,
      iconColor: 'var(--color-brand)',
    },
    {
      label: 'Recovered Revenue',
      value: LAKHS(m.recoveredRevenue),
      sub: 'This period',
      delta: m.recoveredDelta,
      deltaLabel: 'vs previous period',
      icon: TrendingUp,
      iconColor: 'var(--color-success)',
    },
    {
      label: 'Active Cases',
      value: m.activeCases,
      sub: `${m.highPriorityCases} high priority`,
      icon: Activity,
      iconColor: 'var(--color-warning)',
    },
    {
      label: 'Avg Recovery Time',
      value: m.avgRecoveryTime,
      sub: 'Detection to resolution',
      icon: RefreshCcw,
      iconColor: 'var(--color-info)',
    },
  ];

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6 animate-fade-in">
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[20px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
            {getGreeting()}, {user?.fullName?.split(' ')[0] ?? 'Merchant'} 👋
          </h2>
          <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {user?.businessName} · {new Date().toLocaleDateString('en-IN', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <LiveIndicator />
          <p className="text-[12px]" style={{ color: 'var(--color-text-muted)' }}>
            Last event: just now
          </p>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {kpis.map(k => <MetricCard key={k.label} {...k} />)}
      </div>

      {/* ── Chart + Funnel ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <RevenueRecoveryChart />
        </div>
        <RecoveryFunnel />
      </div>

      {/* ── Cases Table + High Priority + Live Activity ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Recent Recovery Cases */}
        <div className="xl:col-span-2 card overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <p className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Recent Recovery Cases
            </p>
            <button
              className="btn-link flex items-center gap-1 text-[12px]"
              onClick={() => navigate('/recovery')}
            >
              View all <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Case', 'Customer', 'Amount', 'Risk', 'Strategy', 'Status'].map(h => (
                    <th
                      key={h}
                      className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentCases.map((c, i) => {
                  const customer = MOCK_CUSTOMERS.find(cu => cu.id === c.customerId);
                  return (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/recovery/${c.id}`)}
                      className="cursor-pointer transition-colors duration-100"
                      style={{ borderBottom: i < recentCases.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                    >
                      <td className="px-5 py-3.5 font-mono-data text-[12px] font-semibold" style={{ color: 'var(--color-brand)' }}>
                        {c.id}
                      </td>
                      <td className="px-5 py-3.5 text-[13px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {customer?.name ?? '—'}
                      </td>
                      <td className="px-5 py-3.5 font-mono-data text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        ₹{c.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-5 py-3.5">
                        <RiskBadge score={c.riskScore} />
                      </td>
                      <td className="px-5 py-3.5 text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                        {c.strategy}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={c.status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column: High Priority + Live Activity */}
        <div className="flex flex-col gap-4">
          {/* High Priority */}
          {MOCK_HIGH_PRIORITY.length > 0 && (
            <div className="card overflow-hidden">
              <div
                className="flex items-center gap-2 px-5 py-4"
                style={{ borderBottom: '1px solid var(--color-border)' }}
              >
                <AlertTriangle size={14} style={{ color: 'var(--color-danger)' }} />
                <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                  High Priority
                </p>
              </div>
              <div className="p-4 space-y-3">
                {MOCK_HIGH_PRIORITY.map(c => (
                  <div
                    key={c.id}
                    className="p-3.5 rounded-xl cursor-pointer transition-colors duration-100"
                    style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-page)' }}
                    onClick={() => navigate(`/recovery/${c.id}`)}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-page)'}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {c.customer}
                      </p>
                      <p className="font-mono-data text-[13px] font-bold" style={{ color: 'var(--color-danger)' }}>
                        ₹{c.amount.toLocaleString('en-IN')}
                      </p>
                    </div>
                    <p className="text-[11px] mb-2" style={{ color: 'var(--color-text-muted)' }}>
                      Risk: {c.riskScore}% · Recovery: {c.recoveryProbability}%
                    </p>
                    <div className="flex items-center justify-between">
                      <StatusBadge status={c.status} size="sm" />
                      <button className="btn-link flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-brand)' }}>
                        View <ExternalLink size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live Activity */}
          <LiveRecoveryActivity />
        </div>
      </div>
    </div>
  );
}
