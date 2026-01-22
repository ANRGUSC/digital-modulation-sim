/**
 * Theme Toggle Component
 *
 * Provides a toggle button to switch between dark and light themes.
 * Useful for users with vision sensitivities or preference for lighter backgrounds.
 *
 * @author Bhaskar Krishnamachari (USC), developed with Claude Code
 */

import React from 'react';

// =============================================================================
// COMPONENT PROPS
// =============================================================================

interface ThemeToggleProps {
  /** Current theme ('dark' or 'light') */
  theme: 'dark' | 'light';
  /** Callback when theme changes */
  onToggle: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * ThemeToggle Component
 *
 * Renders a button to toggle between dark and light themes.
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({ theme, onToggle }) => {
  const isDark = theme === 'dark';

  return (
    <button
      onClick={onToggle}
      className={`
        px-3 py-2 rounded-lg font-medium text-sm
        transition-all duration-150
        ${isDark
          ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
          : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
        }
        focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2
        ${isDark ? 'focus:ring-offset-slate-800' : 'focus:ring-offset-slate-50'}
      `}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme for better visibility`}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
    >
      {isDark ? 'Light' : 'Dark'}
    </button>
  );
};

export default ThemeToggle;
