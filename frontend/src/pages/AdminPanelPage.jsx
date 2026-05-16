import React, { useEffect, useState } from 'react';
import { RefreshCw, UserPlus, Edit } from 'lucide-react';
import {
  fetchAdminUsers,
  updateAdminUser,
  createAdminUser
} from '../api/client';

const ROLES = ['FARMER', 'AGRONOMIST', 'ADMIN'];

export default function AdminPanelPage() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [creatingUser, setCreatingUser] = useState(false);

  const loadUsers = async () => {
    setIsLoading(true);
    setError('');

    try {
      const data = await fetchAdminUsers();
      setUsers(data || []);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load users.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      setIsLoading(true);
      setError('');

      try {
        const data = await fetchAdminUsers();
        setUsers(data || []);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load users.');
      } finally {
        setIsLoading(false);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <div className="content-page">
      <section className="page-hero glass-panel">
        <div>
          <div className="page-kicker">Admin Panel</div>
          <h1 className="page-title" style={{ fontSize: '1.75rem' }}>
            User Management
          </h1>
          <p className="page-subtitle">
            View registered users, edit profile data, change roles, and block or activate accounts.
          </p>
        </div>

        <div className="page-hero-actions">
          <button type="button" className="secondary-btn" onClick={loadUsers}>
            <RefreshCw size={16} />
            Refresh
          </button>

          <button
            type="button"
            className="primary-btn"
            onClick={() => setCreatingUser(true)}
          >
            <UserPlus size={16} />
            Create User
          </button>
        </div>
      </section>

      {error && (
        <div className="glass-panel" style={errorStyle}>
          {error}
        </div>
      )}

      <section className="section-card glass-panel">
        <div className="section-card-header">
          <div>
            <div className="section-kicker">Users</div>
            <h2>Registered accounts</h2>
          </div>

          <span className="status-pill neutral">
            {isLoading ? 'Loading...' : `${users.length} users`}
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>
                <th style={thStyle}>User</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Role</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Created</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div className="app-user-avatar">
                        {getInitials(user)}
                      </div>

                      <div>
                        <strong>{user.full_name || 'Unnamed user'}</strong>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                          ID: {user.id}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td style={tdStyle}>{user.email || '—'}</td>
                  <td style={tdStyle}>{user.role || '—'}</td>
                  <td style={tdStyle}>{user.is_active ? 'Active' : 'Blocked'}</td>

                  <td style={tdStyle}>
                    {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                  </td>

                  <td style={tdStyle}>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => setEditingUser(user)}
                      style={{ padding: '9px 12px' }}
                    >
                      <Edit size={15} />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}

              {!isLoading && users.length === 0 && (
                <tr>
                  <td colSpan="6" style={emptyStyle}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {creatingUser && (
        <CreateUserModal
          onClose={() => setCreatingUser(false)}
          onCreated={(newUser) => {
            setUsers((current) => [newUser, ...current]);
            setCreatingUser(false);
          }}
          setError={setError}
        />
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={(updatedUser) => {
            setUsers((current) =>
              current.map((user) => (user.id === updatedUser.id ? updatedUser : user))
            );
            setEditingUser(null);
          }}
          setError={setError}
        />
      )}
    </div>
  );
}

function CreateUserModal({ onClose, onCreated, setError }) {
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'FARMER'
  });

  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const newUser = await createAdminUser({
        email: form.email,
        fullName: form.fullName,
        password: form.password,
        role: form.role
      });

      onCreated(newUser);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <form className="glass-panel" style={modalStyle} onSubmit={handleSubmit}>
        <h2 style={{ marginBottom: '16px' }}>Create User</h2>

        <label style={labelStyle}>Full name</label>
        <input
          style={inputStyle}
          value={form.fullName}
          onChange={(e) => handleChange('fullName', e.target.value)}
          required
        />

        <label style={labelStyle}>Email</label>
        <input
          style={inputStyle}
          type="email"
          value={form.email}
          onChange={(e) => handleChange('email', e.target.value)}
          required
        />

        <label style={labelStyle}>Password</label>
        <input
          style={inputStyle}
          type="password"
          value={form.password}
          onChange={(e) => handleChange('password', e.target.value)}
          required
          minLength={6}
        />

        <label style={labelStyle}>Role</label>
        <select
          style={inputStyle}
          value={form.role}
          onChange={(e) => handleChange('role', e.target.value)}
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>

        <div style={modalActionsStyle}>
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancel
          </button>

          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? 'Creating...' : 'Create user'}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditUserModal({ user, onClose, onSaved, setError }) {
  const [form, setForm] = useState({
    fullName: user.full_name || '',
    email: user.email || '',
    role: user.role || 'FARMER',
    isActive: Boolean(user.is_active)
  });

  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const updatedUser = await updateAdminUser({
        userId: user.id,
        email: form.email,
        fullName: form.fullName,
        role: form.role,
        isActive: form.isActive
      });

      onSaved(updatedUser);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update user.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <form className="glass-panel" style={modalStyle} onSubmit={handleSubmit}>
        <h2 style={{ marginBottom: '16px' }}>Edit User</h2>

        <label style={labelStyle}>Full name</label>
        <input
          style={inputStyle}
          value={form.fullName}
          onChange={(e) => handleChange('fullName', e.target.value)}
          required
        />

        <label style={labelStyle}>Email</label>
        <input
          style={inputStyle}
          type="email"
          value={form.email}
          onChange={(e) => handleChange('email', e.target.value)}
          required
        />

        <label style={labelStyle}>Role</label>
        <select
          style={inputStyle}
          value={form.role}
          onChange={(e) => handleChange('role', e.target.value)}
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>

        <label style={labelStyle}>Status</label>
        <select
          style={inputStyle}
          value={form.isActive ? 'active' : 'blocked'}
          onChange={(e) => handleChange('isActive', e.target.value === 'active')}
        >
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>

        <div style={modalActionsStyle}>
          <button type="button" className="secondary-btn" onClick={onClose}>
            Cancel
          </button>

          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

function getInitials(user) {
  return (user.full_name || user.email || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  minWidth: '780px'
};

const thStyle = {
  padding: '12px 14px',
  fontSize: '0.76rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 800
};

const tdStyle = {
  padding: '14px',
  verticalAlign: 'middle'
};

const emptyStyle = {
  ...tdStyle,
  textAlign: 'center',
  color: 'var(--text-secondary)'
};

const errorStyle = {
  padding: '14px 16px',
  borderRadius: '14px',
  color: 'var(--status-critical)',
  borderColor: 'rgba(239, 68, 68, 0.3)'
};

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(2, 6, 23, 0.72)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999
};

const modalStyle = {
  width: '100%',
  maxWidth: '460px',
  padding: '24px',
  borderRadius: '20px'
};

const labelStyle = {
  display: 'block',
  marginTop: '12px',
  marginBottom: '6px',
  color: 'var(--text-secondary)',
  fontWeight: 700,
  fontSize: '0.78rem'
};

const inputStyle = {
  width: '100%',
  padding: '11px 12px',
  borderRadius: '12px',
  background: 'rgba(15, 23, 42, 0.45)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  outline: 'none'
};

const modalActionsStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '10px',
  marginTop: '20px'
};
