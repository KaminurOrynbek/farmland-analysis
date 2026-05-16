import React, { useMemo } from 'react';
import AgroVisionLogo from '../common/AgroVisionLogo';
import {
  Home,
  Map as MapIcon,
  LineChart,
  FolderOpen,
  Users,
  Settings,
  LogOut,
  ShieldCheck
} from 'lucide-react';

const ADMIN_NAV = [
  { id: 'Admin', label: 'Admin Panel', icon: <ShieldCheck size={16} /> }
];

const LOGOUT_NAV = {
  id: 'Logout',
  label: 'Logout',
  icon: <LogOut size={16} />
};

function NavButton({ item, activePage, onNavigate, onLogout, isLogout = false }) {
  const isActive = activePage === item.id && !isLogout;

  return (
    <button
      onClick={isLogout ? onLogout : () => onNavigate(item.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '9px 12px',
        width: '100%',
        background: isActive ? 'var(--accent-color)' : 'transparent',
        color: isActive
          ? '#fff'
          : isLogout
            ? '#fca5a5'
            : 'var(--text-secondary)',
        border: 'none',
        borderRadius: '10px',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '0.86rem',
        textAlign: 'left',
        transition: 'all 0.2s'
      }}
    >
      {item.icon}
      {item.label}
    </button>
  );
}

export default function AppSidebar({ activePage, onNavigate, onLogout, user }) {
  const isAdmin = user?.role === 'ADMIN';
  const isAgronomist = user?.role === 'AGRONOMIST';
  const isFarmer = user?.role === 'FARMER';

  const mainNav = useMemo(() => ([
    { id: 'Home', label: isAdmin ? 'System Dashboard' : 'Dashboard', icon: <Home size={16} /> },
    { id: 'Workspace', label: isAgronomist ? 'Field Review' : 'Workspace', icon: <MapIcon size={16} /> },
    { id: 'Analysis Report', label: isAgronomist ? 'Reports' : 'Analysis Report', icon: <LineChart size={16} /> },
    {
      id: 'Projects',
      label: isFarmer ? 'My Farm' : isAgronomist ? 'Clients' : 'Projects',
      icon: <FolderOpen size={16} />
    }
  ]), [isAdmin, isAgronomist, isFarmer]);

  const bottomNav = useMemo(() => ([
    {
      id: 'Team / Access',
      label: isFarmer ? 'Field Sharing' : isAgronomist ? 'Collaborators' : 'Team / Access',
      icon: <Users size={16} />
    },
    { id: 'Settings', label: 'Settings', icon: <Settings size={16} /> }
  ]), [isAgronomist, isFarmer]);

  return (
    <aside
      style={{
        width: '220px',
        borderRight: '1px solid var(--border-color)',
        background: 'var(--bg-panel)',
        display: 'flex',
        flexDirection: 'column',
        padding: '18px 12px',
        gap: '6px',
        flexShrink: 0
      }}
    >
      <div
        style={{
          marginBottom: '24px',
          paddingLeft: '8px',
          fontSize: '1rem',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          cursor: 'pointer'
        }}
        onClick={() => onNavigate('Home')}
      >
        <AgroVisionLogo size={32} showText />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        {mainNav.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            activePage={activePage}
            onNavigate={onNavigate}
            onLogout={onLogout}
          />
        ))}

        {isAdmin && (
          <>
            <div
              style={{
                height: '1px',
                background: 'var(--border-color)',
                margin: '8px 0'
              }}
            />

            {ADMIN_NAV.map((item) => (
              <NavButton
                key={item.id}
                item={item}
                activePage={activePage}
                onNavigate={onNavigate}
                onLogout={onLogout}
              />
            ))}
          </>
        )}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          borderTop: '1px solid var(--border-color)',
          paddingTop: '14px',
          marginTop: 'auto'
        }}
      >
        {bottomNav.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            activePage={activePage}
            onNavigate={onNavigate}
            onLogout={onLogout}
          />
        ))}

        <NavButton
          item={LOGOUT_NAV}
          activePage={activePage}
          onNavigate={onNavigate}
          onLogout={onLogout}
          isLogout
        />
      </div>
    </aside>
  );
}
