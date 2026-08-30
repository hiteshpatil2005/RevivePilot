/**
 * LiveIndicator — subtle pulsing dot + label.
 * Props:
 *   label   (string)  default 'Live'
 *   size    ('sm'|'md')
 */
export default function LiveIndicator({ label = 'Live', size = 'md' }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="animate-pulse-live inline-block rounded-full"
        style={{
          width:  size === 'sm' ? '6px' : '7px',
          height: size === 'sm' ? '6px' : '7px',
          backgroundColor: 'var(--color-success)',
        }}
        aria-hidden="true"
      />
      <span
        className={`font-semibold uppercase tracking-wider ${size === 'sm' ? 'text-[10px]' : 'text-[11px]'}`}
        style={{ color: 'var(--color-success)' }}
      >
        {label}
      </span>
    </div>
  );
}
