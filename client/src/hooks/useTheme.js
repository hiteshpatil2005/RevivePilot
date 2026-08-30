import { useThemeContext } from '../context/ThemeContext';

/**
 * Convenience hook that exposes { theme, toggleTheme, isDark }
 */
export function useTheme() {
  const { theme, toggleTheme } = useThemeContext();
  return { theme, toggleTheme, isDark: theme === 'dark' };
}
