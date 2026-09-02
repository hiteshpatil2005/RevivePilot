import { useState } from 'react';
import {
  AreaChart, Area, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, Target, Zap,
  ShieldCheck, BarChart3, Download, RefreshCw, Brain,
  Search, Lightbulb, CheckCircle2, AlertCircle, ExternalLink, ArrowRight
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
import SkeletonLoader from '../../components/common/SkeletonLoader';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtAmount = (paise) => {
  const r = (paise || 0) / 100;
  if (r >= 100000) return `₹${(r / 100000).toFixed(1)}L`;
  if (r >= 1000)   return `₹${(r / 1000).toFixed(1)}K`;
  return `₹${r.toLocaleString('en-IN')}`;
};

const fmtCurrency = (val) => {
  const v = Number(val || 0);
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000)   return `₹${(v / 1000).toFixed(1)}K`;
  return `₹${v.toLocaleString('en-IN')}`;
};

// ── Custom Tooltips ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3.5 shadow-md text-xs space-y-1.5 min-w-[170px]">
      <p className="font-bold text-slate-800 border-b border-slate-100 pb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-slate-600">{p.name}:</span>
          </div>
          <span className="font-mono font-bold text-slate-900">
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
    <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-md text-xs space-y-1 min-w-[150px]">
      <p className="font-bold text-slate-800 border-b border-slate-100 pb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-3">
          <span className="text-slate-600">{p.name}:</span>
          <span className="font-mono font-bold text-slate-900">{Number(p.value).toFixed(1)}%</span>
        </div>
      ))}
    </div>
  );
}

// ── Period Toggle ─────────────────────────────────────────────────────────────
function PeriodToggle({ value, onChange }) {
  const periods = ['7D', '30D', '90D'];
  return (
    <div className="inline-flex rounded-md border border-slate-300 bg-white p-0.5 shadow-2xs">
      {periods.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={`px-3 py-1.5 text-xs font-bold rounded cursor-pointer transition-all ${
            value === p
              ? 'bg-[#0c6ff9] text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          {p}
        </button>
      ))}
    </div>
  );
}

// ── Clean Accuracy Bar ─────────────────────────────────────────────────────────
function AccuracyBar({ agent, accuracy, icon: Icon }) {
  const getColor = (v) => {
    if (v >= 95) return '#10b981';
    if (v >= 85) return '#0c6ff9';
    return '#f59e0b';
  };
  const color = getColor(accuracy);

  return (
    <div className="space-y-1.5 py-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon size={14} style={{ color }} />
          </div>
          <span className="font-semibold text-slate-800">{agent}</span>
        </div>
        <span className="font-mono font-bold" style={{ color }}>{accuracy}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${accuracy}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

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

  const kpis = [
    {
      label: 'Total Volume Processed',
      value: fmtAmount((m.totalRevenueProcessed || 128450000)),
      delta: m.totalProcessedDelta || 8.2,
      icon: DollarSign,
      color: '#0c6ff9',
      bgTint: 'rgba(12, 111, 249, 0.08)',
    },
    {
      label: 'Revenue At Risk',
      value: fmtAmount((m.revenueAtRisk || 9684400)),
      delta: m.atRiskDelta || -12.4,
      icon: AlertCircle,
      color: '#ef4444',
      bgTint: 'rgba(239, 68, 68, 0.08)',
    },
    {
      label: 'Expected Recovery',
      value: fmtAmount((m.expectedRecovery || 12000000)),
      delta: m.expectedDelta || 4.1,
      icon: Target,
      color: '#f59e0b',
      bgTint: 'rgba(245, 158, 11, 0.08)',
    },
    {
      label: 'Actual Recovered',
      value: fmtAmount((m.actualRecovered || 2500000)),
      delta: m.recoveredDelta || 18.7,
      icon: TrendingUp,
      color: '#10b981',
      bgTint: 'rgba(16, 185, 129, 0.08)',
    },
    {
      label: 'Overall Recovery Rate',
      value: `${m.recoveryRate || 74.9}%`,
      delta: m.recoveryRateDelta || 3.8,
      icon: BarChart3,
      color: '#0891b2',
      bgTint: 'rgba(8, 145, 178, 0.08)',
    },
    {
      label: 'Total Revenue Saved',
      value: fmtAmount((m.revenueSaved || 4280000)),
      delta: m.savedDelta || 15.2,
      icon: ShieldCheck,
      color: '#10b981',
      bgTint: 'rgba(16, 185, 129, 0.08)',
    },
  ];

  return (
    <div className="w-full max-w-[1720px] px-6 lg:px-10 py-7 space-y-6 mx-auto animate-fade-in text-slate-900 font-sans">
      {/* ── Enterprise Header (Razorpay White Theme) ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Revenue Analytics
            </h1>
            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-[#0c6ff9] border border-blue-200">
              Performance Intelligence
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Measure recovery rates, revenue saved from leakage, and multi-agent AI yield across payment gateways
          </p>
        </div>

        {/* Clean Production Toolbar */}
        <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
          <a
            href="http://localhost:5174"
            target="_blank"
            rel="noreferrer"
            className="h-9 px-4 rounded text-xs font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-[#0c6ff9] hover:border-[#0c6ff9] flex items-center gap-2 transition-all shadow-2xs"
            title="Open customer checkout portal on port 5174"
          >
            <ExternalLink size={14} className="text-[#0c6ff9]" />
            <span>Customer Store (:5174)</span>
          </a>

          <PeriodToggle value={period} onChange={setPeriod} />

          <button
            type="button"
            onClick={handleExport}
            className="h-9 px-4 rounded text-xs font-bold bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-all shadow-2xs cursor-pointer"
          >
            <Download size={14} />
            <span>Export Report</span>
          </button>
        </div>
      </div>

      {/* ── 6 Clean KPI Metric Cards (NO LEFT BORDER, Pure White Background) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
                <p className="text-2xl font-extrabold font-mono text-slate-900 tracking-tight leading-none">
                  {k.value}
                </p>
              </div>

              {k.delta != null && (
                <div className="flex items-center gap-1.5 text-xs font-semibold pt-2.5 border-t border-slate-100">
                  {isPositive && <TrendingUp size={13} className="text-emerald-600" />}
                  {isNegative && <TrendingDown size={13} className="text-red-600" />}
                  <span className={isPositive ? 'text-emerald-700' : isNegative ? 'text-red-700' : 'text-slate-500'}>
                    {k.delta > 0 ? '+' : ''}{k.delta}% vs period
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Recovery Performance Area Chart ── */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Recovery Performance Timeline
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Revenue at risk vs expected recovery vs actual recovered revenue over time
            </p>
          </div>
          <PeriodToggle value={period} onChange={setPeriod} />
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradAtRisk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradExpected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradRecovered" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtCurrency} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={56} />
            <Tooltip content={<ChartTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }} />
            <Area type="monotone" dataKey="atRisk" name="At Risk" stroke="#ef4444" fill="url(#gradAtRisk)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="expected" name="Expected Recovery" stroke="#f59e0b" fill="url(#gradExpected)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="recovered" name="Actual Recovered" stroke="#10b981" fill="url(#gradRecovered)" strokeWidth={2.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Row: Recovery Rate Line Chart + Realization Meter ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recovery Rate Trend (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Recovery Rate Benchmark
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Current performance cycle compared against previous period
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-700">
                {m.recoveryRate}%
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                +{m.recoveryRateDelta}%
              </span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={rateData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis domain={[40, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={44} />
              <Tooltip content={<RateTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              <Line type="monotone" dataKey="current" name="Current Cycle" stroke="#0c6ff9" strokeWidth={2.5} dot={false} />
              <Line type="monotone" dataKey="previous" name="Previous Cycle" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="4 3" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Recovery Realization (1 col) */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-2xs space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              Recovery Realization
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Actual captured revenue vs anticipated recovery
            </p>
          </div>

          <div className="space-y-4">
            {/* Expected */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Expected Recovery</span>
                <span className="font-bold font-mono text-amber-700">
                  {fmtAmount((m.expectedRecovery || 12000000))}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full w-full" />
              </div>
            </div>

            {/* Actual */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Actual Recovered</span>
                <span className="font-bold font-mono text-emerald-700">
                  {fmtAmount((m.actualRecovered || 2500000))}
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min(100, m.recoveryRealization || 88)}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                Realization Index
              </span>
              <p className="text-3xl font-extrabold font-mono text-[#0c6ff9]">
                {m.recoveryRealization || 88.5}%
              </p>
              <p className="text-xs text-slate-500">
                Formula: Actual Recovered ÷ Expected Target
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row: Strategy Performance Table + Leakage Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Strategy Performance Table (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg shadow-2xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 bg-white">
            <h2 className="text-base font-bold text-slate-900">
              Strategy Conversion Breakdown
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Comparative efficiency across automated recovery intervention channels
            </p>
          </div>

          <div className="overflow-x-auto bg-white">
            <table className="w-full text-left text-xs bg-white">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Strategy Channel</th>
                  <th className="px-6 py-3.5 text-center">Interventions</th>
                  <th className="px-6 py-3.5 text-center">Recovered Value</th>
                  <th className="px-6 py-3.5 text-center">Success Rate</th>
                  <th className="px-6 py-3.5 text-center">Avg Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {stratData.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-slate-50/80 transition-colors bg-white"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {row.strategy}
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-slate-700">
                      {row.attempts}
                    </td>
                    <td className="px-6 py-4 text-center font-mono font-bold text-slate-900">
                      {fmtCurrency(row.recovered)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        row.successRate >= 70
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : row.successRate >= 60
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {row.successRate}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center font-mono text-slate-500">
                      {row.avgTime}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Leakage Breakdown Donut (1 col) */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              Revenue Leakage Causes
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Root cause categorization of failed payments
            </p>
          </div>

          <ResponsiveContainer width="100%" height={170}>
            <PieChart>
              <Pie
                data={breakdownData}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={75}
                paddingAngle={3}
                dataKey="amount"
              >
                {breakdownData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [fmtCurrency(value), 'Amount']}
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#0f172a',
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-2.5 pt-2 border-t border-slate-100">
            {breakdownData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium text-slate-700">{item.category}</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span className="font-bold text-slate-900">{fmtCurrency(item.amount)}</span>
                  <span className="text-slate-400 text-[11px]">({item.pct}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row: AI Effectiveness & Agent Accuracy ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Key Metrics (2 cols) */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'AI Qualified Cases', value: aiData.aiQualifiedCases, icon: Brain, color: '#0c6ff9', bg: 'rgba(12, 111, 249, 0.08)' },
            { label: 'Successful Strategies', value: aiData.successfulStrategies, icon: CheckCircle2, color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)' },
            { label: 'AI Success Rate', value: `${aiData.aiSuccessRate}%`, icon: Target, color: '#0891b2', bg: 'rgba(8, 145, 178, 0.08)' },
            { label: 'Avg Decision Time', value: `${aiData.avgDecisionTimeSec}s`, icon: Zap, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.08)' },
            { label: 'Revenue Recovered', value: fmtCurrency(aiData.revenueRecovered), icon: DollarSign, color: '#10b981', bg: 'rgba(16, 185, 129, 0.08)' },
            { label: 'Autonomous Agents', value: '4 / 4 Active', icon: RefreshCw, color: '#0c6ff9', bg: 'rgba(12, 111, 249, 0.08)' },
          ].map((m2, idx) => (
            <div
              key={idx}
              className="p-5 rounded-lg bg-white border border-slate-200 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {m2.label}
                </span>
                <div
                  className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: m2.bg }}
                >
                  <m2.icon size={15} style={{ color: m2.color }} />
                </div>
              </div>
              <div className="mt-3">
                <p className="text-2xl font-bold font-mono text-slate-900">
                  {m2.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Agent Accuracy Panel (1 col) */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-2xs space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">
              Agent Accuracy Index
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Consensus precision per autonomous agent
            </p>
          </div>

          <div className="space-y-3">
            {MOCK_AI_EFFECTIVENESS.agentAccuracy.map((item, idx) => {
              const icons = [Search, Brain, Lightbulb, Brain];
              const Icon = icons[idx] || Brain;
              return (
                <AccuracyBar key={idx} agent={item.agent} accuracy={item.accuracy} icon={Icon} />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
