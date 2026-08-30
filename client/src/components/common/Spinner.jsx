import { Loader2 } from 'lucide-react';

/**
 * Spinner — minimal loading indicator.
 * Props: size (number), className
 */
export default function Spinner({ size = 18, className = '' }) {
  return (
    <Loader2
      size={size}
      className={`animate-spin-slow text-[var(--color-brand)] ${className}`}
      aria-label="Loading"
    />
  );
}
