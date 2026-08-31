import { useState } from 'react';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, Target, Zap,
  ShieldCheck, BarChart3, Download, RefreshCcw, Brain,
  Search, Lightbulb, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { useAnalytics } from '../../hooks/useAnalytics';
import {
  MOCK_ANALYTICS_METRICS,
  REVENUE_CHART_DATA,
  MOCK_RECOVERY_RATE_DATA,
  MOCK_STRATEGY_PERFORMANCE,
  MOCK_REVENUE_BREAKDOWN,
  MOCK_AI_EFFECTIVENESS,
} from '../../data/mockData';
import MetricCard from '../../components/common/MetricCard';
import SkeletonLoader from '../../components/common/SkeletonLoader';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtAmount = (paise) => {
  const r = paise / 100;
  if (r >= 100000) return `₹${(r / 100000).toFixed(1)}L`;
  if (r >= 1000)   return `₹${(r / 1000).toFixed(1)}K`;
  return `₹${r.toLocaleString('en-IN')}`;
};

const fmtCurrency = (val) => {
  if (val >= 100000) return `₹${(val / 100000).toFixed(1)}L`;
  if (val >= 1000)   return `₹${(val / 1000).toFixed(1)}K`;
  return `₹${val}`;
};

// ── Custom Tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      backgroundColor: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      borderRadius: '10px',
      padding: '10px 14px',
      boxShadow: 'var(--shadow-dropdown)',
    }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '11px', marginBottom: '6px' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: p.color, display: 'inline-block' }} />
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>{p.name}:</span>
          <span style={{ color: 'var(--color-text-primary)', fontSize: '12px', fontWeight: 600 }}>
            {fmtCurrency(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function RateTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      backgroundColor: 'var(--color-bg-card)',
      border: '1px solid var(--color-border)',
      borderRadius: '10px',
      padding: '10px 14px',
      boxShadow: 'var(--shadow-dropdown)',
    }}>
      <p style={{ color: 'var(--color-text-muted)', fontSize: '11px', marginBottom: '6px' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: p.color, display: 'inline-block' }} />
          <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>{p.name}:</span>
          <span style={{ color: 'var(--color-text-primary)', fontSize: '12px', fontWeight: 600 }}>{p.value.toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Section Card wrapper ──────────────────────────────────────────────────────
function SectionCard({ children, className = '', style = {} }) {
  return (
    <div
      className={`card p-6 ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="text-[15px] font-semibold mb-1" style={{ color: 'var(--color-text-primary)' }}>
      {children}
    </h2>
  );
}

// ── Period Toggle ─────────────────────────────────────────────────────────────
function PeriodToggle({ value, onChange }) {
  const periods = ['7D', '30D', '90D'];
  return (
    <div
      className="flex rounded-lg overflow-hidden"
      style={{ border: '1px solid var(--color-border)' }}
    >
      {periods.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className="px-3 py-1.5 text-[12px] font-semibold cursor-pointer transition-all"
          style={{
            backgroundColor: value === p ? 'var(--color-brand)' : 'var(--color-bg-card)',
            color: value === p ? '#fff' : 'var(--color-text-secondary)',
            border: 'none',
            borderRight: p !== '90D' ? '1px solid var(--color-border)' : 'none',
          }}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

// ── Agent accuracy bar ────────────────────────────────────────────────────────
function AccuracyBar({ agent, accuracy, icon: Icon }) {
  const getColor = (v) => {
    if (v >= 95) return 'var(--color-success)';
    if (v >= 85) return 'var(--color-brand)';
    return 'var(--color-warning)';
  };
  const color = getColor(accuracy);

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={13} style={{ color }} />
          </div>
          <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{agent}</span>
        </div>
        <span style={{ fontSize: '14px', fontWeight: 700, color }}>{accuracy}%</span>
      </div>
      <div style={{ height: 6, backgroundColor: 'var(--color-bg-muted)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${accuracy}%`, backgroundColor: color, borderRadius: 99, transition: 'width 0.8s ease' }} />
      </div>
    </div>
  );
}

const AGENT_ICONS = { Search, Microscope: Brain, Lightbulb, Brain };

// ─────────────────────────────────────────────────────────────────────────────
// Main Analytics Page
// ─────────────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const [period, setPeriod] = useState('7D');
  const {
    metrics: apiMetrics,
    revenueChart: apiChart,
    recoveryRateChart: apiRate,
    strategyPerformance: apiStrat,
    revenueBreakdown: apiBreakdown,
    aiEffectiveness: apiAi,
    loading,
  } = useAnalytics(period);

  const m = apiMetrics || MOCK_ANALYTICS_METRICS;
  const chartData = (apiChart && apiChart.length > 0) ? apiChart : REVENUE_CHART_DATA[period];
  const rateData = (apiRate && apiRate.length > 0) ? apiRate : MOCK_RECOVERY_RATE_DATA[period];
  const stratData = (apiStrat && apiStrat.length > 0) ? apiStrat : MOCK_STRATEGY_PERFORMANCE;
  const breakdownData = (apiBreakdown && apiBreakdown.length > 0) ? apiBreakdown : MOCK_REVENUE_BREAKDOWN;
  const aiData = apiAi || MOCK_AI_EFFECTIVENESS;

  const handleExport = () => {
    const csv = [
      'Period,At Risk,Expected Recovery,Actual Recovered',
      ...chartData.map(d => `${d.label},${d.atRisk},${d.expected},${d.recovered}`)
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `revivepilot-analytics-${period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in" style={{ maxWidth: '100%' }}>
      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Revenue Analytics
          </h1>
          <p className="text-[14px] mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            Measure recovery performance, revenue at risk, and the effectiveness of RevivePilot strategies.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <PeriodToggle value={period} onChange={setPeriod} />
          <button
            onClick={handleExport}
            className="btn-ghost flex items-center gap-2"
            style={{ fontSize: '13px', padding: '8px 14px' }}
          >
            <Download size={14} />
            Export Report
          </button>
        </div>
      </div>

      {/* ── Revenue Metrics Grid ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <MetricCard
          label="Total Revenue Processed"
          value={fmtAmount(m.totalRevenueProcessed * 100)}
          delta={m.totalProcessedDelta}
          icon={DollarSign}
          iconColor="var(--color-brand)"
          highlight
        />
        <MetricCard
          label="Revenue At Risk"
          value={fmtAmount(m.revenueAtRisk * 100)}
          delta={m.atRiskDelta}
          icon={AlertCircle}
          iconColor="var(--color-danger)"
          highlight
        />
        <MetricCard
          label="Expected Recovery"
          value={fmtAmount(m.expectedRecovery * 100)}
          delta={m.expectedDelta}
          icon={Target}
          iconColor="var(--color-warning)"
          highlight
        />
        <MetricCard
          label="Actual Recovered"
          value={fmtAmount(m.actualRecovered * 100)}
          delta={m.recoveredDelta}
          icon={TrendingUp}
          iconColor="var(--color-success)"
          highlight
        />
        <MetricCard
          label="Recovery Rate"
          value={`${m.recoveryRate}%`}
          delta={m.recoveryRateDelta}
          icon={BarChart3}
          iconColor="var(--color-info)"
          highlight
        />
        <MetricCard
          label="Revenue Saved"
          value={fmtAmount(m.revenueSaved * 100)}
          delta={m.savedDelta}
          icon={ShieldCheck}
          iconColor="var(--color-success)"
          highlight
        />
      </div>

      {/* ── Recovery Performance Chart ─────────────────────────────────────── */}
      <SectionCard>
        <div className="flex items-center justify-between mb-5">
          <div>
            <SectionTitle>Recovery Performance</SectionTitle>
            <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
              Revenue at risk vs expected vs actual recovery over time
            </p>
          </div>
          <PeriodToggle value={period} onChange={setPeriod} />
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="gradAtRisk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradExpected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradRecovered" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#34d399" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#34d399" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtCurrency} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={56} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--color-text-secondary)', paddingTop: '12px' }} />
            <Area type="monotone" dataKey="atRisk" name="At Risk" stroke="#ef4444" fill="url(#gradAtRisk)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="expected" name="Expected Recovery" stroke="#f97316" fill="url(#gradExpected)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="recovered" name="Actual Recovered" stroke="#34d399" fill="url(#gradRecovered)" strokeWidth={2.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </SectionCard>

      {/* ── Row: Recovery Rate Chart + Expected vs Actual ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recovery Rate Chart */}
        <div className="lg:col-span-2">
          <SectionCard>
            <div className="flex items-center justify-between mb-5">
              <div>
                <SectionTitle>Recovery Rate</SectionTitle>
                <p className="text-[13px]" style={{ color: 'var(--color-text-muted)' }}>
                  Current vs previous period
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[22px] font-bold font-mono-data" style={{ color: 'var(--color-success)' }}>
                  {m.recoveryRate}%
                </span>
                <div className="flex items-center gap-1">
                  <TrendingUp size={13} style={{ color: 'var(--color-success)' }} />
                  <span className="text-[12px] font-medium" style={{ color: 'var(--color-success)' }}>
                    +{m.recoveryRateDelta}%
                  </span>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={rateData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[40, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} width={44} />
                <Tooltip content={<RateTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px', color: 'var(--color-text-secondary)', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="current" name="Current" stroke="var(--color-brand)" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="previous" name="Previous Period" stroke="var(--color-text-muted)" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </SectionCard>
        </div>

        {/* Expected vs Actual */}
        <SectionCard>
          <SectionTitle>Recovery Realization</SectionTitle>
          <p className="text-[13px] mb-5" style={{ color: 'var(--color-text-muted)' }}>
            Expected vs actual outcome
          </p>

          <div className="space-y-4">
            {/* Expected */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>Expected Recovery</span>
                <span className="text-[14px] font-bold font-mono-data" style={{ color: 'var(--color-warning)' }}>
                  {fmtAmount(m.expectedRecovery * 100)}
                </span>
              </div>
              <div style={{ height: 8, backgroundColor: 'var(--color-bg-muted)', borderRadius: 99 }}>
                <div style={{ height: '100%', width: '100%', backgroundColor: 'var(--color-warning)', borderRadius: 99 }} />
              </div>
            </div>

            {/* Actual */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>Actual Recovered</span>
                <span className="text-[14px] font-bold font-mono-data" style={{ color: 'var(--color-success)' }}>
                  {fmtAmount(m.actualRecovered * 100)}
                </span>
              </div>
              <div style={{ height: 8, backgroundColor: 'var(--color-bg-muted)', borderRadius: 99 }}>
                <div style={{ height: '100%', width: `${m.recoveryRealization}%`, backgroundColor: 'var(--color-success)', borderRadius: 99 }} />
              </div>
            </div>

            <div
              className="rounded-xl p-4 mt-2"
              style={{ backgroundColor: 'var(--color-bg-muted)', border: '1px solid var(--color-border)' }}
            >
              <p className="text-[11px] uppercase font-semibold tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Recovery Realization
              </p>
              <p className="text-[28px] font-bold font-mono-data" style={{ color: 'var(--color-brand)' }}>
                {m.recoveryRealization}%
              </p>
              <p className="text-[12px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Actual ÷ expected
              </p>
            </div>

            <div
              className="rounded-lg p-3"
              style={{ backgroundColor: 'var(--color-info-bg)', border: '1px solid var(--color-info)' + '40' }}
            >
              <p className="text-[12px]" style={{ color: 'var(--color-info)' }}>
                RevivePilot measures <strong>actual</strong> recovered revenue — not just predictions.
              </p>
            </div>
          </div>
        </SectionCard>
      </div>

      {/* ── Row: Strategy Performance + Revenue Breakdown ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Strategy Performance Table */}
        <div className="lg:col-span-2">
          <SectionCard>
            <SectionTitle>Strategy Performance</SectionTitle>
            <p className="text-[13px] mb-5" style={{ color: 'var(--color-text-muted)' }}>
              Outcome comparison across all recovery strategies
            </p>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                    {['Strategy', 'Attempts', 'Recovered', 'Success Rate', 'Avg Time'].map(h => (
                      <th key={h} style={{
                        padding: '8px 12px', textAlign: h === 'Strategy' ? 'left' : 'center',
                        color: 'var(--color-text-muted)', fontSize: '11px',
                        fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {stratData.map((row, idx) => (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: '1px solid var(--color-border)',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}
                    >
                      <td style={{ padding: '12px 12px', color: 'var(--color-text-primary)', fontWeight: 500 }}>
                        {row.strategy}
                      </td>
                      <td style={{ padding: '12px 12px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                        {row.attempts}
                      </td>
                      <td style={{ padding: '12px 12px', textAlign: 'center', color: 'var(--color-success)', fontWeight: 600, fontFamily: 'monospace' }}>
                        {fmtCurrency(row.recovered)}
                      </td>
                      <td style={{ padding: '12px 12px', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block', padding: '2px 10px', borderRadius: 99,
                          backgroundColor: row.successRate >= 70 ? 'var(--color-success-bg)' : row.successRate >= 60 ? 'var(--color-warning-bg)' : 'var(--color-danger-bg)',
                          color: row.successRate >= 70 ? 'var(--color-success)' : row.successRate >= 60 ? 'var(--color-warning)' : 'var(--color-danger)',
                          fontSize: '12px', fontWeight: 700,
                        }}>
                          {row.successRate}%
                        </span>
                      </td>
                      <td style={{ padding: '12px 12px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                        {row.avgTime}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>

        {/* Revenue Breakdown */}
        <SectionCard>
          <SectionTitle>Revenue At Risk Breakdown</SectionTitle>
          <p className="text-[13px] mb-4" style={{ color: 'var(--color-text-muted)' }}>
            Leakage by category
          </p>

          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={breakdownData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="amount">
                {breakdownData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [fmtCurrency(value), 'Amount']}
                contentStyle={{
                  backgroundColor: 'var(--color-bg-card)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '10px',
                  fontSize: '12px',
                  color: 'var(--color-text-primary)',
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-2 mt-2">
            {breakdownData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: item.color, display: 'inline-block', flexShrink: 0 }} />
                  <span className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>{item.category}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-semibold font-mono-data" style={{ color: 'var(--color-text-primary)' }}>
                    {fmtCurrency(item.amount)}
                  </span>
                  <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                    {item.pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* ── AI Effectiveness ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* AI Metrics */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'AI Qualified Cases',     value: aiData.aiQualifiedCases,    icon: Brain,      color: 'var(--color-brand)' },
            { label: 'Successful Strategies',  value: aiData.successfulStrategies, icon: CheckCircle2, color: 'var(--color-success)' },
            { label: 'AI Success Rate',        value: `${aiData.aiSuccessRate}%`,  icon: Target,     color: 'var(--color-info)' },
            { label: 'Avg Decision Time',      value: `${aiData.avgDecisionTimeSec}s`, icon: Zap,    color: 'var(--color-warning)' },
            { label: 'Revenue Recovered',      value: fmtCurrency(aiData.revenueRecovered), icon: DollarSign, color: 'var(--color-success)' },
            { label: 'Agents Active',          value: '4 / 4',                                   icon: RefreshCcw, color: 'var(--color-brand)' },
          ].map((m2, idx) => (
            <SectionCard key={idx} style={{ padding: '20px' }}>
              <div className="flex items-start justify-between mb-2">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                  {m2.label}
                </p>
                <div style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: `${m2.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <m2.icon size={13} style={{ color: m2.color }} />
                </div>
              </div>
              <p className="text-[24px] font-bold font-mono-data" style={{ color: 'var(--color-text-primary)' }}>
                {m2.value}
              </p>
            </SectionCard>
          ))}
        </div>

        {/* Agent Accuracy */}
        <SectionCard>
          <SectionTitle>Agent Accuracy</SectionTitle>
          <p className="text-[13px] mb-5" style={{ color: 'var(--color-text-muted)' }}>
            Per-agent performance metrics
          </p>
          {MOCK_AI_EFFECTIVENESS.agentAccuracy.map((item, idx) => {
            const iconMap = { Search, Brain, Lightbulb, 'Brain (Learning)': Brain };
            const Icon = [Search, Brain, Lightbulb, Brain][idx];
            return (
              <AccuracyBar key={idx} agent={item.agent} accuracy={item.accuracy} icon={Icon} />
            );
          })}
        </SectionCard>
      </div>
    </div>
  );
}
