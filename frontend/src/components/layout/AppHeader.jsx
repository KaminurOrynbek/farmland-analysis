import React from 'react';

const getDisplayName = (user) => {
  return user?.full_name || user?.name || 'AgroVision User';
};

const getInitials = (name = 'AgroVision User') => (
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join('') || 'AG'
);

export default function Navbar({ activePage, onNavigate, user }) {
  const displayName = getDisplayName(user);
  const initials = getInitials(displayName);

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
          {activePage}
        </strong>
      </div>

      <button
        className="app-user-chip"
        onClick={() => onNavigate('Settings')}
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
            {user?.role || 'FARMER'}
          </span>
        </div>
      </button>
    </nav>
  );
}
