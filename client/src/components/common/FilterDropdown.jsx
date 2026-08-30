import { ChevronDown } from 'lucide-react';

/**
 * FilterDropdown — styled select for filter menus.
 *
 * Props:
 *   value      (string)
 *   onChange   (fn)
 *   options    ([{ value, label }])
 *   className  (string)
 */
export default function FilterDropdown({ value, onChange, options, className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input-base appearance-none pr-8 cursor-pointer"
        style={{ paddingTop: '8px', paddingBottom: '8px' }}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={14}
        className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ color: 'var(--color-text-muted)' }}
      />
    </div>
  );
}
