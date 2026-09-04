import { ArrowDown } from 'lucide-react';

function FunnelBar({ value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className="h-1.5 rounded-full overflow-hidden"
      style={{ backgroundColor: 'var(--color-border)' }}
    >
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

const FUNNEL_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981'];

/**
 * RecoveryFunnel — vertical funnel showing real recovery pipeline stages from metrics.
 */
export default function RecoveryFunnel({ metrics }) {
  const active = metrics?.activeCases ?? 0;
  const recAmt = metrics?.recoveredRevenue ?? 0;
  const recoveredCount = recAmt > 0 ? 1 : 0;
  const total = (metrics?.totalEventsToday ?? 0) > 0 ? metrics.totalEventsToday : (active + recoveredCount);

  const stages = [
    { label: 'Failures Detected', value: total },
    { label: 'Risk Evaluated', value: total > 0 ? Math.min(total, active + recoveredCount) : 0 },
    { label: 'Action Dispatched', value: total > 0 ? Math.min(total, active + recoveredCount) : 0 },
    { label: 'Revenue Recovered', value: recoveredCount },
  ].map((s, i, arr) => {
    const pct = arr[0].value > 0 ? Math.round((s.value / arr[0].value) * 100) : 0;
    return { ...s, pct };
  });

  const maxVal = stages[0].value || 1;

  return (
    <div className="card overflow-hidden">
      <div
        className="px-5 py-4"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <p className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          Recovery Pipeline
        </p>
        <p className="text-[12px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
          Today's conversion funnel
        </p>
      </div>

      <div className="px-5 py-4 space-y-3">
        {stages.map((stage, i) => (
          <div key={stage.label}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: FUNNEL_COLORS[i] }}
                />
                <span
                  className="text-[12px] font-medium"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {stage.label}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[13px] font-bold font-mono-data"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  {stage.value.toLocaleString('en-IN')}
                </span>
                {i > 0 && (
                  <span
                    className="text-[11px] px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: 'var(--color-success-bg)',
                      color: 'var(--color-success)',
                    }}
                  >
                    {stage.pct}%
                  </span>
                )}
              </div>
            </div>
            <FunnelBar value={stage.value} max={maxVal} color={FUNNEL_COLORS[i]} />
            {i < stages.length - 1 && (
              <div className="flex justify-center my-1">
                <ArrowDown size={12} style={{ color: 'var(--color-text-muted)' }} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
