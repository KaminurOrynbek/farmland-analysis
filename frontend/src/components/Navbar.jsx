import React from 'react';
import {
  FolderOpen,
  Home,
  Leaf,
  LineChart,
  Map,
  UserRound
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'Home', icon: <Home size={18} /> },
  { id: 'Workspace', icon: <Map size={18} /> },
  { id: 'Analysis Details', icon: <LineChart size={18} /> },
  { id: 'Projects', icon: <FolderOpen size={18} /> },
  { id: 'Profile', icon: <UserRound size={18} /> }
];

const getInitials = (name = 'AgroVision') => (
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join('') || 'AG'
);

export default function Navbar({ backendHealthy, activePage, onNavigate, user }) {
  const initials = getInitials(user?.name);

  return (
    <nav className="app-navbar glass-panel">
      <div
        className="app-navbar-brand"
        onClick={() => onNavigate('Home')}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            onNavigate('Home');
          }
        }}
      >
        <div className="app-navbar-logo">
          <Leaf color="white" size={22} />
        </div>

        <div>
          <h1 className="app-navbar-title">AgroVision</h1>
          <span className="app-navbar-subtitle">
            Premium farmland intelligence service
          </span>
        </div>
      </div>

      <div className="app-navbar-links">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className={`app-nav-link ${activePage === item.id ? 'active' : ''}`}
          >
            {item.icon}
            {item.id}
          </button>
        ))}
      </div>

      <div className="app-navbar-right">
        <span className={`status-pill ${backendHealthy ? 'healthy' : 'critical'}`}>
          {backendHealthy ? 'Backend Connected' : 'Backend Unavailable'}
        </span>

        <div className="app-user-chip">
          <div className="app-user-avatar">{initials}</div>
          <div className="app-user-meta">
            <strong>{user?.name || 'AgroVision User'}</strong>
            <span>{user?.role || 'Research Analyst'}</span>
          </div>
        </div>
      </div>
    </nav>
  );
}
