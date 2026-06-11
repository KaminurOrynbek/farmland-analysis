import React from 'react';
import { APP_PAGES } from '../../constants/appPages';
import ThemeToggleButton from '../common/ThemeToggleButton.jsx';
import LanguageSwitcher from '../common/LanguageSwitcher.jsx';
import { getUserRoleLabel, t } from '../../i18n.js';

const getDisplayName = (user) => {
  return user?.full_name || user?.name || t('AgroVision User');
};

const getInitials = (name = t('AgroVision User')) => (
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join('') || 'AG'
);

export default function AppHeader({
  activePage,
  onNavigate,
  onOpenGuidedTour,
  user,
  theme,
  onToggleTheme,
  locale,
  onChangeLocale
}) {
  const displayName = getDisplayName(user);
  const initials = getInitials(displayName);
  const canOpenGuide =
    activePage === APP_PAGES.WORKSPACE &&
    typeof onOpenGuidedTour === 'function';

  return (
    <nav
      className="app-navbar glass-panel"
      style={{
        minHeight: '58px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        padding: '0 18px',
        background: 'var(--bg-panel)'
      }}
    >
      <div className="app-navbar-right" style={{ alignItems: 'center' }}>
        <strong style={{ color: 'var(--text-primary)', fontSize: '0.95rem' }}>
          {t(activePage)}
        </strong>
      </div>

      <div className="app-navbar-right" style={{ alignItems: 'center' }}>
        <LanguageSwitcher value={locale} onChange={onChangeLocale} />
        <ThemeToggleButton theme={theme} onToggle={onToggleTheme} />

        {canOpenGuide ? (
          <button
            type="button"
            className="secondary-btn app-guide-btn"
            onClick={onOpenGuidedTour}
          >
            {t('Workflow guide')}
          </button>
        ) : null}

        <button
          type="button"
          className="app-user-chip"
          onClick={() => onNavigate(APP_PAGES.SETTINGS)}
          style={{
            cursor: 'pointer',
            background: 'transparent',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 8px'
          }}
        >
          <div className="app-user-avatar">{initials}</div>

          <div className="app-user-meta" style={{ textAlign: 'left' }}>
            <strong style={{ color: 'var(--text-primary)', fontSize: '0.82rem' }}>
              {displayName}
            </strong>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.72rem' }}>
              {getUserRoleLabel(user?.role)}
            </span>
          </div>
        </button>
      </div>
    </nav>
  );
}
