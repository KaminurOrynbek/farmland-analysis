import React, { useState } from 'react';
import { LogOut, ShieldCheck, Map, CheckCircle2, History, AlertTriangle } from 'lucide-react';

export default function ProfilePage({ user, onLogout }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || 'AgroVision User',
    email: user?.email || 'farmer@agrovision.ai'
  });

  const handleSave = () => {
    setIsEditing(false);
  };

  return (
    <div className="content-page" style={{ maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      <h1 className="page-title" style={{ marginBottom: '32px' }}>Profile / Account Settings</h1>
      
      <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        
        {/* LEFT COLUMN: Profile info */}
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-panel" style={{ padding: '32px', borderRadius: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
              <div style={{
                width: '80px', height: '80px', borderRadius: '20px',
                background: 'linear-gradient(135deg, var(--accent-color), #1d4ed8)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem', fontWeight: 800
              }}>
                {formData.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{formData.name}</h2>
                <span className="status-pill neutral" style={{ textTransform: 'capitalize' }}>{user?.role?.toLowerCase() || 'Farmer'}</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>Full Name</label>
                {isEditing ? (
                  <input 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }}
                  />
                ) : (
                  <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>{formData.name}</div>
                )}
              </div>
              
              <div>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '8px' }}>Email Address</label>
                {isEditing ? (
                  <input 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '12px', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: 'white' }}
                  />
                ) : (
                  <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>{formData.email}</div>
                )}
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
              {isEditing ? (
                <>
                  <button className="primary-btn" onClick={handleSave}>Save Changes</button>
                  <button className="secondary-btn" onClick={() => setIsEditing(false)}>Cancel</button>
                </>
              ) : (
                <button className="secondary-btn" onClick={() => setIsEditing(true)}>Edit Profile</button>
              )}
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '32px', borderRadius: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <History size={20} color="var(--accent-color)" />
              Recent Activity
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <strong style={{ color: 'var(--text-primary)', display: 'block' }}>Analyzed: North Field 4</strong>
                2 days ago • NDVI 0.65 • Low Risk
              </div>
              <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <strong style={{ color: 'var(--text-primary)', display: 'block' }}>Analyzed: Valley Parcel B</strong>
                5 days ago • NDVI 0.42 • High Risk
              </div>
              <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <strong style={{ color: 'var(--text-primary)', display: 'block' }}>Created: West Sector</strong>
                1 week ago • 142 ha
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Stats & Permissions */}
        <div style={{ flex: '1 1 340px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="glass-panel" style={{ padding: '24px', borderRadius: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={20} color="var(--status-healthy)" />
              My Permissions
            </h3>
            <div style={{ marginBottom: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>
              {user?.role === 'ADMIN' ? 'Admin' : 'Farmer'}
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              <li style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <CheckCircle2 size={16} color="var(--accent-color)" /> Can create fields
              </li>
              <li style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <CheckCircle2 size={16} color="var(--accent-color)" /> Can run analysis
              </li>
              <li style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <CheckCircle2 size={16} color="var(--accent-color)" /> Can view reports
              </li>
              <li style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <CheckCircle2 size={16} color="var(--accent-color)" /> Can share fields
              </li>
              {user?.role === 'ADMIN' && (
                <li style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <CheckCircle2 size={16} color="var(--status-warning)" /> Can access admin tools
                </li>
              )}
            </ul>
          </div>

          <div className="glass-panel" style={{ padding: '24px', borderRadius: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '20px' }}>Stats</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Saved fields
                </span>
                <strong style={{ fontSize: '1.2rem' }}>3</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Completed analyses
                </span>
                <strong style={{ fontSize: '1.2rem' }}>12</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Shared fields
                </span>
                <strong style={{ fontSize: '1.2rem' }}>1</strong>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px', borderRadius: '24px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '20px', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={18} /> Danger Zone
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Sign out of your current session. You will need to log back in to access your data.
            </p>
            <button 
              className="secondary-btn" 
              onClick={onLogout}
              style={{ width: '100%', display: 'flex', justifyContent: 'center', color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.05)' }}
            >
              <LogOut size={18} /> Logout
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
