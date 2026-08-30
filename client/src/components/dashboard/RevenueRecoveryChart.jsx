import { useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { REVENUE_CHART_DATA } from '../../data/mockData';
import { useTheme } from '../../hooks/useTheme';

const PERIODS = ['7D', '30D', '90D'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="card p-3 text-[12px] min-w-[160px]"
      style={{ boxShadow: 'var(--shadow-dropdown)' }}
    >
      <p className="font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>{label}</p>
      {payload.map(p => (
        <div key={p.name} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span style={{ color: 'var(--color-text-secondary)' }}>{p.name}</span>
          </div>
          <span className="font-mono-data font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            ₹{p.value.toLocaleString('en-IN')}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * RevenueRecoveryChart — Recharts area chart with period filter.
 * Adapts to light/dark theme via CSS variables.
 */
export default function RevenueRecoveryChart() {
  const [period, setPeriod] = useState('7D');
  const { isDark } = useTheme();

  const data = REVENUE_CHART_DATA[period];
  const gridColor  = isDark ? '#1e293b' : '#e2e8f0';
  const axisColor  = isDark ? '#475569' : '#94a3b8';

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <div>
          <p className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Revenue Recovery
          </p>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            At Risk · Expected · Actual Recovery
          </p>
        </div>
        {/* Period toggle */}
        <div
          className="flex items-center rounded-lg overflow-hidden"
          style={{ border: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-muted)' }}
        >
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-3 py-1.5 text-[12px] font-semibold transition-all duration-150 cursor-pointer"
              style={{
                backgroundColor: period === p ? 'var(--color-brand)' : 'transparent',
                color: period === p ? '#fff' : 'var(--color-text-secondary)',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="p-5">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="gradAtRisk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradExpected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradRecovered" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="label"
              tick={{ fill: axisColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              interval={period === '30D' ? 4 : 0}
            />
            <YAxis
              tick={{ fill: axisColor, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={v => `₹${(v / 1000).toFixed(0)}K`}
              width={52}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
            />
            <Area
              type="monotone"
              dataKey="atRisk"
              name="At Risk"
              stroke="#ef4444"
              strokeWidth={1.5}
              fill="url(#gradAtRisk)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="expected"
              name="Expected Recovery"
              stroke="#3b82f6"
              strokeWidth={1.5}
              fill="url(#gradExpected)"
              dot={false}
            />
            <Area
              type="monotone"
              dataKey="recovered"
              name="Recovered"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#gradRecovered)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
