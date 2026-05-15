import React from 'react';

const getInitials = (name = 'AgroVision') => (
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join('') || 'AG'
);

export default function Navbar({ onNavigate, user }) {
  const initials = getInitials(user?.name);

  return (
    <nav className="app-navbar glass-panel" style={{ minHeight: '74px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', padding: '0 24px', background: 'var(--bg-panel)' }}>
      <button 
        className="app-user-chip" 
        onClick={() => onNavigate('Profile')}
        style={{ cursor: 'pointer', background: 'transparent', border: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}
      >
        <div className="app-user-avatar">{initials}</div>
        <div className="app-user-meta" style={{ textAlign: 'left' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{user?.name || 'AgroVision User'}</strong>
          <span style={{ color: 'var(--text-secondary)' }}>{user?.role || 'FARMER'}</span>
        </div>
      </button>
    </nav>
  );
}
