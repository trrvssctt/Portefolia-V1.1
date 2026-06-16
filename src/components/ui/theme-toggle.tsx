import React from 'react';
import { Button } from './button';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  onThemeChange?: (theme: 'light' | 'dark') => void;
  initial?: 'light' | 'dark';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ onThemeChange, initial = 'light' }) => {
  const [theme, setTheme] = React.useState<'light' | 'dark'>(initial);

  React.useEffect(() => {
    // apply theme to document root (tailwind friendly)
    if (theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    onThemeChange?.(theme);
  }, [theme]);

  return (
    <button
      onClick={() => setTheme(prev => (prev === 'light' ? 'dark' : 'light'))}
      aria-label="Toggle theme"
      className="inline-flex items-center justify-center h-10 w-10 rounded-md border border-gray-200 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700"
    >
      {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-yellow-400" />}
    </button>
  );
};

export default ThemeToggle;
