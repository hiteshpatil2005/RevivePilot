import { Search } from 'lucide-react';

/**
 * SearchInput — consistent search field used in tables/lists.
 *
 * Props:
 *   value       (string)
 *   onChange    (fn)
 *   placeholder (string)
 *   className   (string)
 */
export default function SearchInput({ value, onChange, placeholder = 'Search…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search
        size={14}
        className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: 'var(--color-text-muted)' }}
      />
      <input
        type="search"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-base pl-9"
        aria-label={placeholder}
      />
    </div>
  );
}
