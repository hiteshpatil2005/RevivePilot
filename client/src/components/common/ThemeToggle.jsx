import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

/**
 * ThemeToggle — icon-only button that switches light/dark mode.
 * Persists to localStorage via ThemeContext.
 */
export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme, theme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className={`
        relative flex items-center justify-center w-9 h-9 rounded-lg
        text-[var(--color-text-secondary)] border border-[var(--color-border)]
        hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]
        transition-all duration-150 cursor-pointer
        ${className}
      `}
    >
      <span
        className="absolute transition-all duration-200"
        style={{ opacity: isDark ? 0 : 1, transform: isDark ? 'rotate(90deg) scale(0.5)' : 'rotate(0deg) scale(1)' }}
        aria-hidden
      >
        <Sun size={16} />
      </span>
      <span
        className="absolute transition-all duration-200"
        style={{ opacity: isDark ? 1 : 0, transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(-90deg) scale(0.5)' }}
        aria-hidden
      >
        <Moon size={16} />
      </span>
    </button>
  );
}
