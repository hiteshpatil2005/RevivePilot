/**
 * RiskBadge — displays a risk score as a colour-coded pill.
 *
 * Props:
 *   score (number) — 0–100
 */
export default function RiskBadge({ score }) {
  const getStyle = s => {
    if (s >= 85) return { bg: 'var(--color-danger-bg)',  color: 'var(--color-danger)',  label: 'Critical' };
    if (s >= 65) return { bg: 'var(--color-warning-bg)', color: 'var(--color-warning)', label: 'High'     };
    if (s >= 45) return { bg: 'var(--color-info-bg)',    color: 'var(--color-info)',    label: 'Medium'   };
    return               { bg: 'var(--color-success-bg)',color: 'var(--color-success)', label: 'Low'      };
  };
  const { bg, color, label } = getStyle(score);
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ backgroundColor: bg, color }}
    >
      <span className="font-mono-data font-bold">{score}%</span>
      <span className="opacity-80">{label}</span>
    </span>
  );
}
