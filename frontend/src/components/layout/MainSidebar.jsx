import React from 'react';
import {
  Home,
  Map as MapIcon,
  LineChart,
  FolderOpen,
  Users,
  Settings,
  Leaf,
  LogOut,
  ShieldCheck
} from 'lucide-react';

const MAIN_NAV = [
  { id: 'Home', label: 'Home', icon: <Home size={16} /> },
  { id: 'Workspace', label: 'Workspace', icon: <MapIcon size={16} /> },
  { id: 'Analysis Report', label: 'Analysis Report', icon: <LineChart size={16} /> },
  { id: 'Projects', label: 'Projects', icon: <FolderOpen size={16} /> }
];

const ADMIN_NAV = [
  { id: 'Admin', label: 'Admin Panel', icon: <ShieldCheck size={16} /> }
];

const BOTTOM_NAV = [
  { id: 'Team / Access', label: 'Team / Access', icon: <Users size={16} /> },
  { id: 'Settings', label: 'Settings', icon: <Settings size={16} /> }
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
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--accent-color), #1d4ed8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Leaf color="white" size={16} />
        </div>
        AgroVision
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        {MAIN_NAV.map((item) => (
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
        {BOTTOM_NAV.map((item) => (
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