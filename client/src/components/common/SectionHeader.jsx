/**
 * SectionHeader — consistent section/page header.
 *
 * Props:
 *   title    (string)
 *   subtitle (string)
 *   action   (ReactNode) — optional right-side content
 */
export default function SectionHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h2
          className="text-[18px] font-bold leading-tight"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {title}
        </h2>
        {subtitle && (
          <p
            className="text-[13px] mt-1"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {action && <div className="flex items-center gap-2 flex-shrink-0">{action}</div>}
    </div>
  );
}
