/**
 * RevivePilot logo mark + wordmark.
 *
 * Props:
 *   size    — 'sm' | 'md' | 'lg'
 *   variant — 'full' (icon + wordmark) | 'icon' | 'wordmark'
 */
export default function Logo({ size = 'md', variant = 'full', className = '' }) {
  const sizes = {
    sm: { icon: 20, text: 'text-sm', sub: 'text-[9px]' },
    md: { icon: 26, text: 'text-base', sub: 'text-[10px]' },
    lg: { icon: 36, text: 'text-xl',  sub: 'text-xs' },
  };
  const s = sizes[size];

  const Icon = () => (
    <svg
      width={s.icon}
      height={s.icon}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      {/* Outer ring */}
      <circle cx="16" cy="16" r="15" stroke="var(--color-brand)" strokeWidth="1.5" />
      {/* Arrow pointing up-right (recovery / lift) */}
      <path
        d="M10 22 L16 10 L22 16"
        stroke="var(--color-brand)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dot at peak */}
      <circle cx="16" cy="10" r="2" fill="var(--color-brand)" />
    </svg>
  );

  if (variant === 'icon') return <Icon />;

  if (variant === 'wordmark') {
    return (
      <span className={`font-bold tracking-tight leading-none ${s.text} text-[var(--color-text-primary)] ${className}`}>
        Revive<span style={{ color: 'var(--color-brand)' }}>Pilot</span>
      </span>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      <Icon />
      <div className="flex flex-col leading-none">
        <span className={`font-bold tracking-tight ${s.text} text-[var(--color-text-primary)]`}>
          Revive<span style={{ color: 'var(--color-brand)' }}>Pilot</span>
        </span>
        <span className={`${s.sub} text-[var(--color-text-muted)] tracking-wider uppercase font-medium mt-0.5`}>
          AI Revenue Recovery
        </span>
      </div>
    </div>
  );
}
