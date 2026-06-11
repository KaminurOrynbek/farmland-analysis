import React, { useMemo } from 'react';
import AgroVisionLogo from '../common/AgroVisionLogo';
import { APP_PAGES } from '../../constants/appPages';
import {
  LayoutDashboard,
  FolderOpen,
  LineChart,
  LogOut,
  Map as MapIcon,
  Settings,
  ShieldCheck,
  Users
} from 'lucide-react';
import { t } from '../../i18n.js';

const ADMIN_NAV = [
  { id: APP_PAGES.ADMIN_PANEL, label: APP_PAGES.ADMIN_PANEL, icon: <ShieldCheck size={16} /> }
];

const ACCOUNT_NAV = [
  { id: APP_PAGES.SETTINGS, label: APP_PAGES.SETTINGS, icon: <Settings size={16} /> }
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
      type="button"
      onClick={isLogout ? onLogout : () => onNavigate(item.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '9px 12px',
        width: '100%',
        background: isActive ? 'var(--accent-color)' : 'transparent',
        color: isActive ? '#fff' : isLogout ? 'var(--status-critical-muted)' : 'var(--text-secondary)',
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
      {t(item.label)}
    </button>
  );
}

export default function AppSidebar({ activePage, onNavigate, onLogout, user }) {
  const isAdmin = user?.role === 'ADMIN';

  const mainNav = useMemo(() => {
    const items = [];

    if (isAdmin) {
      items.push({ id: APP_PAGES.DASHBOARD, label: APP_PAGES.DASHBOARD, icon: <LayoutDashboard size={16} /> });
    }

    items.push(
      { id: APP_PAGES.FIELDS, label: APP_PAGES.FIELDS, icon: <FolderOpen size={16} /> },
      { id: APP_PAGES.WORKSPACE, label: APP_PAGES.WORKSPACE, icon: <MapIcon size={16} /> },
      {
        id: APP_PAGES.ANALYSIS_RESULTS,
        label: APP_PAGES.ANALYSIS_RESULTS,
        icon: <LineChart size={16} />
      },
      { id: APP_PAGES.FIELD_SHARING, label: APP_PAGES.FIELD_SHARING, icon: <Users size={16} /> }
    );

    return items;
  }, [isAdmin]);

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
        onClick={() => onNavigate(isAdmin ? APP_PAGES.DASHBOARD : APP_PAGES.FIELDS)}
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

        {isAdmin ? (
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
        ) : null}
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
        {ACCOUNT_NAV.map((item) => (
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
