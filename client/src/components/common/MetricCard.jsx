import { TrendingUp, TrendingDown } from 'lucide-react';

/**
 * MetricCard — standardised KPI card used on Dashboard and detail pages.
 *
 * Props:
 *   label    (string)
 *   value    (string|number)
 *   sub      (string)         — supporting detail text
 *   delta    (number|null)    — % change vs previous period
 *   deltaLabel (string)       — e.g. 'vs last week'
 *   icon     (LucideIcon)
 *   iconColor (string)        — CSS colour string
 *   highlight (bool)          — adds a left accent border
 *
 * Designed for dynamic data: just update props to show live values.
 */
export default function MetricCard({
  label,
  value,
  sub,
  delta,
  deltaLabel = 'vs last period',
  icon: Icon,
  iconColor = 'var(--color-brand)',
  highlight = false,
  className = '',
}) {
  const isPositive = delta != null && delta > 0;
  const isNegative = delta != null && delta < 0;

  return (
    <div
      className={`card p-5 flex flex-col gap-3 ${className}`}
      style={highlight ? { borderLeft: `3px solid ${iconColor}` } : {}}
    >
      {/* Header row */}
      <div className="flex items-start justify-between">
        <p
          className="text-[11px] font-semibold uppercase tracking-widest leading-tight"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {label}
        </p>
        {Icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${iconColor}1a` }}
          >
            <Icon size={15} style={{ color: iconColor }} />
          </div>
        )}
      </div>

      {/* Main value */}
      <div>
        <p
          className="text-[26px] font-bold leading-none font-mono-data"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {value}
        </p>
        {sub && (
          <p
            className="text-[12px] mt-1.5 leading-snug"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {sub}
          </p>
        )}
      </div>

      {/* Delta */}
      {delta != null && (
        <div className="flex items-center gap-1">
          {isPositive && <TrendingUp size={11} style={{ color: 'var(--color-success)' }} />}
          {isNegative && <TrendingDown size={11} style={{ color: 'var(--color-danger)' }} />}
          <span
            className="text-[11px] font-medium"
            style={{
              color: isPositive
                ? 'var(--color-success)'
                : isNegative
                  ? 'var(--color-danger)'
                  : 'var(--color-text-muted)',
            }}
          >
            {delta > 0 ? '+' : ''}{delta}% {deltaLabel}
          </span>
        </div>
      )}
    </div>
  );
}
