/**
 * EmptyState — shown when a list/table has no results.
 *
 * Props:
 *   icon     (ReactNode)
 *   title    (string)
 *   subtitle (string)
 *   action   (ReactNode)
 */
export default function EmptyState({ icon, title = 'No results', subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      {icon && (
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
          style={{ backgroundColor: 'var(--color-bg-muted)' }}
        >
          {icon}
        </div>
      )}
      <p
        className="text-[15px] font-semibold mb-1"
        style={{ color: 'var(--color-text-primary)' }}
      >
        {title}
      </p>
      {subtitle && (
        <p
          className="text-[13px] max-w-xs"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {subtitle}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
