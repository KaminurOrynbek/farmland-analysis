import React from 'react';
import { Home, Map as MapIcon, LineChart, FolderOpen, Users, Settings, Leaf, LogOut } from 'lucide-react';

const MAIN_NAV = [
  { id: 'Home', label: 'Home', icon: <Home size={18} /> },
  { id: 'Workspace', label: 'Workspace', icon: <MapIcon size={18} /> },
  { id: 'Analysis Report', label: 'Analysis Report', icon: <LineChart size={18} /> },
  { id: 'Projects', label: 'Projects', icon: <FolderOpen size={18} /> }
];

const BOTTOM_NAV = [
  { id: 'Team / Access', label: 'Team / Access', icon: <Users size={18} /> },
  { id: 'Settings', label: 'Settings', icon: <Settings size={18} /> }
];

export default function AppSidebar({ activePage, onNavigate, onLogout }) {
  const NavButton = ({ item, isLogout }) => (
    <button
      onClick={isLogout ? onLogout : () => onNavigate(item.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', width: '100%',
        background: activePage === item.id && !isLogout ? 'var(--accent-color)' : 'transparent',
        color: activePage === item.id && !isLogout ? '#fff' : (isLogout ? '#fca5a5' : 'var(--text-secondary)'),
        border: 'none', borderRadius: '12px', cursor: 'pointer',
        fontWeight: 600, textAlign: 'left', transition: 'all 0.2s'
      }}
    >
      {item.icon}
      {item.label}
    </button>
  );

  return (
    <aside style={{ 
      width: '260px', 
      borderRight: '1px solid var(--border-color)', 
      background: 'var(--bg-panel)', 
      display: 'flex', 
      flexDirection: 'column', 
      padding: '24px 16px', 
      gap: '8px',
      flexShrink: 0
    }}>
      <div 
        style={{ 
          marginBottom: '32px', 
          paddingLeft: '12px', 
          fontSize: '1.2rem', 
          fontWeight: 700, 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px',
          cursor: 'pointer'
        }}
        onClick={() => onNavigate('Home')}
      >
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'linear-gradient(135deg, var(--accent-color), #1d4ed8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Leaf color="white" size={18} />
        </div>
        AgroVision
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
        {MAIN_NAV.map(item => <NavButton key={item.id} item={item} />)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', marginTop: 'auto' }}>
        {BOTTOM_NAV.map(item => <NavButton key={item.id} item={item} />)}
        <NavButton item={{ label: 'Logout', icon: <LogOut size={18} /> }} isLogout />
      </div>
    </aside>
  );
}
