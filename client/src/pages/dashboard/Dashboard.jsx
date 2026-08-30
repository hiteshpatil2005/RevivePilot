import {
  TrendingUp, TrendingDown, RefreshCcw, Bot,
  Clock, ArrowUpRight, Activity,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MOCK_KPI, MOCK_RECOVERY_CASES, MOCK_AGENTS, MOCK_ACTIVITY } from '../../data/mockData';

/**
 * KPICard — single metric card.
 * Designed to accept dynamic props later (WebSocket updates).
 */
function KPICard({ label, value, sub, trend, icon: Icon, color }) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
          {label}
        </p>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}22` }}
        >
          <Icon size={15} style={{ color }} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold font-mono-data" style={{ color: 'var(--color-text-primary)' }}>
          {value}
        </p>
        {sub && (
          <p className="text-[12px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {sub}
          </p>
        )}
      </div>
      {trend && (
        <div className="flex items-center gap-1">
          {trend > 0
            ? <TrendingUp size={12} style={{ color: 'var(--color-success)' }} />
            : <TrendingDown size={12} style={{ color: 'var(--color-danger)' }} />
          }
          <span
            className="text-[11px] font-medium"
            style={{ color: trend > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
          >
            {trend > 0 ? '+' : ''}{trend}% vs last week
          </span>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    recovered:   { label: 'Recovered',   cls: 'badge-success' },
    in_progress: { label: 'In Progress', cls: 'badge-info'    },
    failed:      { label: 'Failed',       cls: 'badge-danger'  },
    pending:     { label: 'Pending',      cls: 'badge-warning' },
  };
  const { label, cls } = map[status] || { label: status, cls: '' };
  return <span className={`badge ${cls}`}>{label}</span>;
}

function ActivityIcon({ type }) {
  const map = {
    recovered: { bg: 'var(--color-success-bg)', color: 'var(--color-success)', icon: TrendingUp },
    detected:  { bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)',  icon: Activity  },
    agent:     { bg: 'var(--color-brand-light)', color: 'var(--color-brand)',  icon: Bot        },
    policy:    { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', icon: RefreshCcw },
  };
  const m = map[type] || map.policy;
  const Icon = m.icon;
  return (
    <div
      className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: m.bg }}
    >
      <Icon size={13} style={{ color: m.color }} />
    </div>
  );
}

/**
 * Dashboard page — overview with KPIs, recent cases, agents, and activity feed.
 * All data comes from mockData.js; will later receive real-time WebSocket updates.
 */
export default function Dashboard() {
  const { user } = useAuth();

  const fmt = n => `₹${(n / 100).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

  const kpis = [
    {
      label: 'Revenue at Risk',
      value: fmt(MOCK_KPI.revenueAtRisk),
      sub: 'Across active failure events',
      trend: -3.2,
      icon: TrendingDown,
      color: 'var(--color-danger)',
    },
    {
      label: 'Recovered Revenue',
      value: fmt(MOCK_KPI.recoveredRevenue),
      sub: 'Last 7 days',
      trend: 12.4,
      icon: TrendingUp,
      color: 'var(--color-success)',
    },
    {
      label: 'Recovery Rate',
      value: `${MOCK_KPI.recoveryRate}%`,
      sub: 'Payment failure resolution',
      trend: 4.1,
      icon: RefreshCcw,
      color: 'var(--color-brand)',
    },
    {
      label: 'Active Cases',
      value: MOCK_KPI.activeCases,
      sub: `${MOCK_KPI.agentsRunning} agents running`,
      icon: Activity,
      color: 'var(--color-warning)',
    },
    {
      label: 'Avg Recovery Time',
      value: MOCK_KPI.avgRecoveryTime,
      sub: 'From detection to resolution',
      icon: Clock,
      color: 'var(--color-info)',
    },
  ];

  return (
    <div className="p-6 max-w-screen-xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[20px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Good evening, {user?.fullName?.split(' ')[0] ?? 'Merchant'} 👋
          </h2>
          <p className="text-[13px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {user?.businessName} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {kpis.map(k => <KPICard key={k.label} {...k} />)}
      </div>

      {/* Bottom grid: Cases + Agents + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent Recovery Cases */}
        <div className="card col-span-1 lg:col-span-2 overflow-hidden">
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: '1px solid var(--color-border)' }}
          >
            <p className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              Recent Recovery Cases
            </p>
            <button
              className="btn-link flex items-center gap-1"
              style={{ fontSize: '12px' }}
            >
              View all <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                  {['Order', 'Customer', 'Amount', 'Reason', 'Status'].map(h => (
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
                {MOCK_RECOVERY_CASES.map((c, i) => (
                  <tr
                    key={c.id}
                    style={{ borderBottom: i < MOCK_RECOVERY_CASES.length - 1 ? '1px solid var(--color-border)' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                  >
                    <td className="px-5 py-3.5 font-mono-data" style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
                      {c.orderId}
                    </td>
                    <td className="px-5 py-3.5 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {c.customer}
                    </td>
                    <td className="px-5 py-3.5 font-mono-data font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      ₹{c.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-5 py-3.5 max-w-[160px]" style={{ color: 'var(--color-text-secondary)' }}>
                      <span className="block truncate">{c.reason}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* AI Agent Status */}
          <div className="card overflow-hidden">
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <p className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                AI Agents
              </p>
              <span className="badge badge-success">
                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: 'var(--color-success)' }} />
                {MOCK_AGENTS.filter(a => a.status === 'active').length} Active
              </span>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
              {MOCK_AGENTS.map(agent => (
                <div key={agent.id} className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'var(--color-brand-light)' }}
                    >
                      <Bot size={12} style={{ color: 'var(--color-brand)' }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
                        {agent.name}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                        {agent.casesHandled} cases · {agent.successRate}% success
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-[11px] font-semibold capitalize px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: agent.status === 'active' ? 'var(--color-success-bg)' : 'var(--color-bg-muted)',
                      color: agent.status === 'active' ? 'var(--color-success)' : 'var(--color-text-muted)',
                    }}
                  >
                    {agent.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="card overflow-hidden flex-1">
            <div
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <p className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                Live Activity
              </p>
              <div className="flex items-center gap-1.5">
                <span
                  className="animate-pulse-live inline-block w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: 'var(--color-success)' }}
                />
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-success)' }}>
                  Live
                </span>
              </div>
            </div>
            <div className="px-5 py-3 space-y-3">
              {MOCK_ACTIVITY.map(act => (
                <div key={act.id} className="flex items-start gap-3">
                  <ActivityIcon type={act.type} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] leading-snug" style={{ color: 'var(--color-text-primary)' }}>
                      {act.message}
                    </p>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                      {act.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
