import React from 'react';
import { LANGUAGE_OPTIONS, t } from '../../i18n.js';

export default function LanguageSwitcher({ value, onChange, className = '' }) {
  return (
    <div
      className={className}
      role="group"
      aria-label={t('Language')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px',
        borderRadius: '999px',
        border: '1px solid var(--border-color)',
        background: 'var(--surface-highlight-2)'
      }}
    >
      {LANGUAGE_OPTIONS.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange?.(option.value)}
            aria-pressed={isActive}
            title={t('Language')}
            style={{
              minWidth: '42px',
              padding: '7px 10px',
              borderRadius: '999px',
              border: 'none',
              background: isActive ? 'var(--accent-color)' : 'transparent',
              color: isActive ? '#ffffff' : 'var(--text-secondary)',
              fontWeight: 800,
              fontSize: '0.78rem',
              cursor: 'pointer',
              transition: 'background 0.2s ease, color 0.2s ease'
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
