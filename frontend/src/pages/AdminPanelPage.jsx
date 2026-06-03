import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  ClipboardList,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  Ban,
  CheckCircle2
} from 'lucide-react';
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminAudit,
  fetchAdminStats,
  fetchAdminUsers,
  updateAdminUser
} from '../api/client';

const ROLES = ['FARMER', 'AGRONOMIST', 'ADMIN'];
const TABS = ['Users', 'Audit Logs'];

export default function AdminPanelPage({ refreshKey }) {
  const [activeTab, setActiveTab] = useState('Users');
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState(null);
  const [savingUserId, setSavingUserId] = useState(null);
  const [roleDrafts, setRoleDrafts] = useState({});

  const loadAdminData = useCallback(async () => {
    setIsLoading(true);
    setError('');

    const [usersResult, statsResult, auditResult] = await Promise.allSettled([
      fetchAdminUsers(),
      fetchAdminStats(),
      fetchAdminAudit()
    ]);

    if (usersResult.status === 'fulfilled') {
      const nextUsers = Array.isArray(usersResult.value) ? usersResult.value : [];
      setUsers(nextUsers);
      setRoleDrafts(Object.fromEntries(nextUsers.map((user) => [user.id, user.role || 'FARMER'])));
    } else {
      setUsers([]);
      setRoleDrafts({});
    }

    if (statsResult.status === 'fulfilled') {
      setStats(statsResult.value);
    } else {
      setStats(null);
    }

    if (auditResult.status === 'fulfilled') {
      setAuditLogs(Array.isArray(auditResult.value) ? auditResult.value : []);
    } else {
      setAuditLogs([]);
    }

    const firstRejected = [usersResult, statsResult, auditResult].find(
      (result) => result.status === 'rejected'
    );

    if (firstRejected?.status === 'rejected') {
      setError(firstRejected.reason?.response?.data?.detail || 'Failed to load admin data.');
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAdminData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadAdminData, refreshKey]);

  const handleDeleteUser = async (userId) => {
    const confirmed = window.confirm('Delete this user account? This action cannot be undone.');
    if (!confirmed) {
      return;
    }

    setDeletingUserId(userId);
    setError('');

    try {
      await deleteAdminUser(userId);
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Failed to delete user.');
    } finally {
      setDeletingUserId(null);
    }
  };

  const handleToggleBlocked = async (user) => {
    setSavingUserId(user.id);
    setError('');

    try {
      await updateAdminUser({
        userId: user.id,
        email: user.email,
        fullName: user.full_name,
        role: roleDrafts[user.id] || user.role,
        isActive: !user.is_active
      });
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Failed to update user status.');
    } finally {
      setSavingUserId(null);
    }
  };

  const handleSaveRole = async (user) => {
    const nextRole = roleDrafts[user.id] || user.role;
    if (nextRole === user.role) {
      return;
    }

    setSavingUserId(user.id);
    setError('');

    try {
      await updateAdminUser({
        userId: user.id,
        email: user.email,
        fullName: user.full_name,
        role: nextRole,
        isActive: user.is_active
      });
      await loadAdminData();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || 'Failed to change role.');
    } finally {
      setSavingUserId(null);
    }
  };

  const summaryCards = useMemo(() => ([
    {
      label: 'Users',
      value: stats?.summary?.users ?? 0,
      helper: 'Registered platform accounts',
      icon: <Users />,
      tone: 'var(--accent-color)'
    },
    {
      label: 'Fields',
      value: stats?.summary?.fields ?? 0,
      helper: 'Saved field records',
      icon: <ShieldCheck />,
      tone: 'var(--status-healthy)'
    },
    {
      label: 'Analyses',
      value: stats?.summary?.analyses ?? 0,
      helper: 'Analysis jobs tracked by the backend',
      icon: <BarChart3 />,
      tone: '#8b5cf6'
    },
    {
      label: 'Blocked Users',
      value: stats?.summary?.blocked_users ?? 0,
      helper: 'Accounts currently disabled',
      icon: <Ban />,
      tone: 'var(--status-warning)'
    }
  ]), [stats]);

  return (
    <div className="content-page">
      <section className="page-hero glass-panel">
        <div>
          <div className="page-kicker">Admin Panel</div>
          <h1 className="page-title" style={{ fontSize: '1.75rem' }}>
            Platform Operations
          </h1>
          <p className="page-subtitle">
            Manage user accounts and review audit history from one professional admin panel.
          </p>
        </div>

        <div className="page-hero-actions">
          <button type="button" className="secondary-btn" onClick={() => void loadAdminData()}>
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

      <section className="metric-grid">
        {summaryCards.map((card) => (
          <div key={card.label} className="metric-card glass-panel">
            <div className="metric-card-top">
              <span className="metric-label">{card.label}</span>
              {React.cloneElement(card.icon, { size: 18, color: card.tone })}
            </div>
            <div className="metric-value">{isLoading ? '...' : card.value}</div>
            <div className="metric-helper">{card.helper}</div>
          </div>
        ))}
      </section>

      <section className="section-card glass-panel">
        <div className="section-card-header">
          <div>
            <div className="section-kicker">Admin Panel</div>
            <h2>Switch between users and audit history</h2>
          </div>

          <span className="status-pill neutral">
            {isLoading
              ? 'Refreshing…'
              : activeTab === 'Audit Logs'
                ? `${auditLogs.length} logs`
                : `${users.length} users`}
          </span>
        </div>

        <div style={tabsStyle}>
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                ...tabButtonStyle,
                ...(activeTab === tab ? activeTabButtonStyle : null)
              }}
            >
              {tab}
            </button>
          ))}
        </div>
      </section>

      {activeTab === 'Users' && (
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
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => {
                  const nextRole = roleDrafts[user.id] || user.role || 'FARMER';
                  const isSaving = savingUserId === user.id;
                  const roleChanged = nextRole !== user.role;

                  return (
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

                      <td style={tdStyle}>
                        <div style={roleControlStyle}>
                          <select
                            style={inlineSelectStyle}
                            value={nextRole}
                            onChange={(event) => setRoleDrafts((current) => ({
                              ...current,
                              [user.id]: event.target.value
                            }))}
                            disabled={isSaving}
                          >
                            {ROLES.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            className="secondary-btn"
                            style={compactActionButtonStyle}
                            disabled={isSaving || !roleChanged}
                            onClick={() => void handleSaveRole(user)}
                          >
                            Change role
                          </button>
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <span className={`status-pill ${user.is_active ? 'healthy' : 'warning'}`}>
                          {user.is_active ? 'Active' : 'Blocked'}
                        </span>
                      </td>

                      <td style={tdStyle}>
                        {user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'}
                      </td>

                      <td style={tdStyle}>
                        <div style={actionsCellStyle}>
                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={() => void handleToggleBlocked(user)}
                            disabled={isSaving}
                            style={compactActionButtonStyle}
                          >
                            {user.is_active ? <Ban size={15} /> : <CheckCircle2 size={15} />}
                            {user.is_active ? 'Block' : 'Unblock'}
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleDeleteUser(user.id)}
                            disabled={deletingUserId === user.id || isSaving}
                            style={{
                              ...dangerButtonStyle,
                              opacity: deletingUserId === user.id || isSaving ? 0.6 : 1,
                              cursor: deletingUserId === user.id || isSaving ? 'not-allowed' : 'pointer'
                            }}
                          >
                            <Trash2 size={15} />
                            {deletingUserId === user.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

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
      )}

      {activeTab === 'Audit Logs' && (
        <section className="section-card glass-panel">
          <div className="section-card-header">
            <div>
              <div className="section-kicker">Audit Logs</div>
              <h2>Recent administrative activity</h2>
            </div>

            <span className="status-pill neutral">
              <ClipboardList size={14} />
              {isLoading ? 'Loading...' : `${auditLogs.length} logs`}
            </span>
          </div>

          {auditLogs.length === 0 && !isLoading ? (
            <div className="empty-state">No audit logs available yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={tableStyle}>
                <thead>
                  <tr style={{ color: 'var(--text-secondary)', textAlign: 'left' }}>
                    <th style={thStyle}>Action</th>
                    <th style={thStyle}>Entity</th>
                    <th style={thStyle}>User ID</th>
                    <th style={thStyle}>Entity ID</th>
                    <th style={thStyle}>Created</th>
                  </tr>
                </thead>

                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} style={{ borderTop: '1px solid var(--border-color)' }}>
                      <td style={tdStyle}>{log.action || '—'}</td>
                      <td style={tdStyle}>{log.entity_type || '—'}</td>
                      <td style={tdStyle}>{log.user_id || '—'}</td>
                      <td style={tdStyle}>{log.entity_id || '—'}</td>
                      <td style={tdStyle}>
                        {log.created_at ? new Date(log.created_at).toLocaleString() : '—'}
                      </td>
                    </tr>
                  ))}

                  {isLoading && (
                    <tr>
                      <td colSpan="5" style={emptyStyle}>
                        Loading audit logs...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {creatingUser && (
        <CreateUserModal
          onClose={() => setCreatingUser(false)}
          onCreated={() => {
            setCreatingUser(false);
            void loadAdminData();
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
      await createAdminUser({
        email: form.email,
        fullName: form.fullName,
        password: form.password,
        role: form.role
      });

      onCreated();
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
          onChange={(event) => handleChange('fullName', event.target.value)}
          required
        />

        <label style={labelStyle}>Email</label>
        <input
          style={inputStyle}
          type="email"
          value={form.email}
          onChange={(event) => handleChange('email', event.target.value)}
          required
        />

        <label style={labelStyle}>Password</label>
        <input
          style={inputStyle}
          type="password"
          value={form.password}
          onChange={(event) => handleChange('password', event.target.value)}
          required
          minLength={6}
        />

        <label style={labelStyle}>Role</label>
        <select
          style={inputStyle}
          value={form.role}
          onChange={(event) => handleChange('role', event.target.value)}
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

function getInitials(user) {
  return (user.full_name || user.email || 'U')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

const tabsStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '10px'
};

const tabButtonStyle = {
  padding: '10px 14px',
  borderRadius: '12px',
  border: '1px solid rgba(148, 163, 184, 0.18)',
  background: 'rgba(15, 23, 42, 0.35)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontWeight: 700
};

const activeTabButtonStyle = {
  background: 'rgba(59, 130, 246, 0.16)',
  borderColor: 'rgba(59, 130, 246, 0.34)',
  color: '#dbeafe'
};

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
  color: '#fecaca',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  background: 'rgba(239, 68, 68, 0.08)'
};

const actionsCellStyle = {
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap'
};

const compactActionButtonStyle = {
  padding: '9px 12px'
};

const roleControlStyle = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center',
  flexWrap: 'wrap'
};

const inlineSelectStyle = {
  padding: '9px 10px',
  borderRadius: '12px',
  background: 'rgba(15, 23, 42, 0.45)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  minWidth: '140px'
};

const dangerButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '8px',
  padding: '9px 12px',
  borderRadius: '12px',
  border: '1px solid rgba(239, 68, 68, 0.35)',
  background: 'rgba(239, 68, 68, 0.08)',
  color: '#fecaca',
  fontWeight: 700
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
