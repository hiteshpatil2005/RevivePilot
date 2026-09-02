/**
 * RevivePilot — Logo
 * Razorpay-inspired angular glyph with clean Inter wordmark.
 */
export default function Logo({ size = 'md', variant = 'full', className = '', light = false }) {
  const sizes = {
    sm: { icon: 20, text: 'text-sm', gap: 'gap-2' },
    md: { icon: 26, text: 'text-[15px]', gap: 'gap-2.5' },
    lg: { icon: 32, text: 'text-lg', gap: 'gap-3' },
    xl: { icon: 40, text: 'text-xl', gap: 'gap-3' },
  };
  const s = sizes[size] || sizes.md;

  const Glyph = () => (
    <svg
      width={s.icon}
      height={s.icon}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Razorpay-style bold angular slash — primary */}
      <path
        d="M4 26L13 6H20L11 26H4Z"
        fill="#0c6ff9"
      />
      {/* Secondary offset slash — recovery symbol */}
      <path
        d="M12 26L21 6H28L19 26H12Z"
        fill="#0c6ff9"
        opacity="0.35"
      />
    </svg>
  );

  const wordmark = (
    <span
      className={`font-extrabold tracking-tight leading-none select-none ${s.text} ${
        light ? 'text-white' : 'text-slate-900'
      }`}
    >
      Revive<span style={{ color: '#0c6ff9' }}>Pilot</span>
    </span>
  );

  if (variant === 'icon') return <Glyph />;

  if (variant === 'wordmark') return wordmark;

  return (
    <div className={`flex items-center ${s.gap} select-none ${className}`}>
      <Glyph />
      {wordmark}
    </div>
  );
}
