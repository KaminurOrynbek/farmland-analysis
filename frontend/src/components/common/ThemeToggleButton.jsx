import React from 'react';
import { MoonStar, SunMedium } from 'lucide-react';

export default function ThemeToggleButton({ theme = 'dark', onToggle, className = '' }) {
  const isLightTheme = theme === 'light';
  const Icon = isLightTheme ? MoonStar : SunMedium;
  const label = isLightTheme ? 'Dark theme' : 'Light theme';

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`.trim()}
      onClick={onToggle}
      aria-label={`Switch to ${label.toLowerCase()}`}
      title={`Switch to ${label.toLowerCase()}`}
      aria-pressed={isLightTheme}
    >
      <Icon size={16} />
      <span className="theme-toggle-label">{label}</span>
    </button>
  );
}
