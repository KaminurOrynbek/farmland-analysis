import React from 'react';
import { MoonStar, SunMedium } from 'lucide-react';
import { t } from '../../i18n.js';

export default function ThemeToggleButton({ theme = 'dark', onToggle, className = '' }) {
  const isLightTheme = theme === 'light';
  const Icon = isLightTheme ? MoonStar : SunMedium;
  const label = isLightTheme ? t('Dark theme') : t('Light theme');
  const switchLabel = t('Switch to {label}', { label: label.toLowerCase() });

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`.trim()}
      onClick={onToggle}
      aria-label={switchLabel}
      title={switchLabel}
      aria-pressed={isLightTheme}
    >
      <Icon size={16} />
      <span className="theme-toggle-label">{label}</span>
    </button>
  );
}
