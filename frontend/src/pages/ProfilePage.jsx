import React, { useState } from 'react';
import { Mail, UserRound, Save, X, Edit3 } from 'lucide-react';
import { updateCurrentUser } from '../api/client';

export default function SettingsPage({ user, onUpdateUser }) {
  const displayName = user?.full_name || user?.name || 'AgroVision User';
  const displayEmail = user?.email || 'farmer@agrovision.ai';
  const displayRole = user?.role || 'FARMER';

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: displayName,
    email: displayEmail
  });

  const handleCancel = () => {
    setFormData({
      name: displayName,
      email: displayEmail
    });
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Full name cannot be empty.');
      return;
    }

    setIsSaving(true);

    try {
      const updatedUser = await updateCurrentUser({
        fullName: formData.name.trim(),
        email: formData.email.trim()
      });

      if (onUpdateUser) {
        onUpdateUser(updatedUser);
      }

      setIsEditing(false);
      setFormData({
        name: updatedUser.full_name || updatedUser.name || '',
        email: updatedUser.email || ''
      });
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setIsSaving(false);
    }
  };

  const initial = formData.name?.charAt(0)?.toUpperCase() || 'A';

  return (
    <div
      className="content-page"
      style={{
        maxWidth: '760px',
        margin: '0 auto',
        width: '100%',
        paddingTop: '28px'
      }}
    >
      <div style={{ marginBottom: '22px' }}>
        <p
          style={{
            color: 'var(--accent-color)',
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}
        >
          Settings
        </p>

        <h1
          className="page-title"
          style={{
            margin: 0,
            fontSize: '1.75rem'
          }}
        >
          Settings
        </h1>

        <p
          style={{
            marginTop: '8px',
            color: 'var(--text-secondary)',
            fontSize: '0.9rem'
          }}
        >
          Manage your personal information and account details.
        </p>
      </div>

      <section
        className="glass-panel"
        style={{
          padding: '24px',
          borderRadius: '20px'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '24px'
          }}
        >
          <div
            style={{
              width: '62px',
              height: '62px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, var(--accent-color), #1d4ed8)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.55rem',
              fontWeight: 800
            }}
          >
            {initial}
          </div>

          <div>
            <h2 style={{ fontSize: '1.15rem', marginBottom: '6px' }}>
              {isEditing ? formData.name : displayName}
            </h2>
            <span className="status-pill neutral" style={{ textTransform: 'capitalize' }}>
              {displayRole.toLowerCase()}
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '14px' }}>
          <div>
            <label style={labelStyle}>
              <UserRound size={15} />
              Full name
            </label>

            {isEditing ? (
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                style={inputStyle}
              />
            ) : (
              <div style={readonlyStyle}>{displayName}</div>
            )}
          </div>

          <div>
            <label style={labelStyle}>
              <Mail size={15} />
              Email address
            </label>

            {isEditing ? (
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={inputStyle}
              />
            ) : (
              <div style={readonlyStyle}>{displayEmail}</div>
            )}
          </div>
        </div>

        <div style={{ marginTop: '22px', display: 'flex', gap: '10px' }}>
          {isEditing ? (
            <>
              <button className="primary-btn" onClick={handleSave} disabled={isSaving}>
                <Save size={16} />
                {isSaving ? 'Saving...' : 'Save'}
              </button>

              <button className="secondary-btn" onClick={handleCancel} disabled={isSaving}>
                <X size={16} />
                Cancel
              </button>
            </>
          ) : (
            <button
              className="secondary-btn"
              onClick={() => {
                setFormData({
                  name: displayName,
                  email: displayEmail
                });
                setIsEditing(true);
              }}
            >
              <Edit3 size={16} />
              Edit profile
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

const labelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '7px',
  color: 'var(--text-secondary)',
  fontSize: '0.78rem',
  fontWeight: 600,
  marginBottom: '7px'
};

const inputStyle = {
  width: '100%',
  padding: '10px 13px',
  borderRadius: '11px',
  background: 'var(--surface-3)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  outline: 'none'
};

const readonlyStyle = {
  padding: '10px 13px',
  background: 'var(--surface-highlight-2)',
  border: '1px solid var(--border-soft)',
  borderRadius: '11px',
  fontSize: '0.9rem'
};
