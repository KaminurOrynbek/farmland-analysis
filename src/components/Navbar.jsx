import React, { useState } from 'react';
import { Leaf, BrainCircuit, Database, LineChart } from 'lucide-react';

export default function Navbar() {
  const [activeTab, setActiveTab] = useState('Map');
  
  const tabs = [
    { id: 'Map', icon: <Leaf size={18} /> },
    { id: 'Analysis', icon: <LineChart size={18} /> },
    { id: 'Data', icon: <Database size={18} /> },
    { id: 'Model', icon: <BrainCircuit size={18} /> }
  ];

  return (
    <nav className="glass-panel" style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '0 24px', 
      height: '64px',
      borderBottom: '1px solid var(--border-color)',
      zIndex: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ 
          background: 'var(--accent-color)', 
          padding: '8px', 
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Leaf color="white" size={24} />
        </div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0 }}>
          Farmland Image Analysis System
        </h1>
      </div>

      <div style={{ display: 'flex', gap: '8px' }}>
        {tabs.map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: activeTab === tab.id ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
              border: 'none',
              borderRadius: '6px',
              color: activeTab === tab.id ? 'var(--accent-color)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'all 0.2s'
            }}
          >
            {tab.icon}
            {tab.id}
          </button>
        ))}
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }} />
      </div>
    </nav>
  );
}
