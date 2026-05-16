import React, { useEffect, useMemo, useState } from 'react';
import { Users, Share2, ShieldCheck, Trash2, RefreshCw, MapPin } from 'lucide-react';
import {
  fetchAllFields,
  fetchFieldTeam,
  shareField,
  revokeFieldAccess
} from '../api/client';

export default function TeamAccessPage({ user, onNavigate }) {
  const [fields, setFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [team, setTeam] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [loading, setLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(false);
  const [message, setMessage] = useState('');

  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedFieldId),
    [fields, selectedFieldId]
  );

  const canManageSelectedField = selectedField?.role === 'OWNER' || user?.role === 'ADMIN';

  const loadFields = async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetchAllFields();
      const fieldList = response.data || [];
      setFields(fieldList);

      if (fieldList.length > 0) {
        setSelectedFieldId((current) => current || fieldList[0].id);
      }
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Failed to load fields.');
    } finally {
      setLoading(false);
    }
  };

  const loadTeam = async (fieldId) => {
    if (!fieldId) {
      setTeam([]);
      return;
    }

    setTeamLoading(true);
    setMessage('');

    try {
      const response = await fetchFieldTeam(fieldId);
      setTeam(Array.isArray(response) ? response : []);
    } catch (error) {
      setTeam([]);
      setMessage(
        error.response?.data?.detail ||
          'Team list is available only for fields where you have OWNER access.'
      );
    } finally {
      setTeamLoading(false);
    }
  };

  useEffect(() => {
    loadFields();
  }, []);

  useEffect(() => {
    if (selectedFieldId) {
      loadTeam(selectedFieldId);
    }
  }, [selectedFieldId]);

  const handleShare = async () => {
    if (!selectedFieldId || !email.trim()) return;

    setMessage('');

    try {
      const result = await shareField({
        fieldId: selectedFieldId,
        email: email.trim(),
        role
      });

      setMessage(result.message || 'Field shared successfully.');
      setEmail('');
      setRole('VIEWER');
      await loadTeam(selectedFieldId);
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Failed to share field.');
    }
  };

  const handleRevoke = async (userId) => {
    if (!selectedFieldId) return;

    try {
      await revokeFieldAccess({
        fieldId: selectedFieldId,
        userId
      });

      await loadTeam(selectedFieldId);
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Failed to revoke access.');
    }
  };

  return (
    <div className="content-page">
      <section className="page-hero glass-panel">
        <div>
          <div className="page-kicker">Team / Access</div>
          <h1 className="page-title">Field Access Management</h1>
          <p className="page-subtitle">
            Manage who can view, analyze, or edit your fields.
          </p>
        </div>

        <button type="button" className="secondary-btn" onClick={loadFields}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </section>

      {message && (
        <div style={noticeStyle}>
          {message}
        </div>
      )}

      {loading ? (
        <div style={emptyStyle}>Loading fields...</div>
      ) : fields.length === 0 ? (
        <div style={emptyStyle}>
          No fields available yet. Create or upload a field in Workspace first.
        </div>
      ) : (
        <div style={gridStyle}>
          <section className="glass-panel" style={panelStyle}>
            <div style={sectionHeaderStyle}>
              <MapPin color="var(--accent-color)" />
              <h2 style={{ margin: 0 }}>Your accessible fields</h2>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              {fields.map((field) => (
                <button
                  key={field.id}
                  type="button"
                  onClick={() => setSelectedFieldId(field.id)}
                  style={{
                    ...fieldCardStyle,
                    borderColor:
                      selectedFieldId === field.id
                        ? 'var(--accent-color)'
                        : 'var(--border-color)'
                  }}
                >
                  <div>
                    <strong>{field.name || 'Unnamed Field'}</strong>
                    <p style={mutedTextStyle}>
                      {field.area_ha ? `${Number(field.area_ha).toFixed(2)} ha` : 'Area unknown'}
                    </p>
                  </div>

                  <span style={roleBadgeStyle}>{field.role || 'VIEWER'}</span>
                </button>
              ))}
            </div>

            <button
              type="button"
              className="secondary-btn"
              style={{ marginTop: '16px' }}
              onClick={() => onNavigate?.('Workspace')}
            >
              Open Workspace
            </button>
          </section>

          <section className="glass-panel" style={panelStyle}>
            <div style={sectionHeaderStyle}>
              <Share2 color="var(--accent-color)" />
              <h2 style={{ margin: 0 }}>Share selected field</h2>
            </div>

            <p style={{ ...mutedTextStyle, marginBottom: '14px' }}>
                Selected field: <strong>{selectedField?.name || '—'}</strong>
            </p>

             
            {!canManageSelectedField ? (
            <div style={{ ...noticeStyle, marginTop: '0' }}>
                You can view this field, but only OWNER can manage team access.
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '12px' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="User email"
                  style={inputStyle}
                />

                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  style={inputStyle}
                >
                  <option value="VIEWER">VIEWER — view only</option>
                  <option value="EDITOR">EDITOR — analyze and edit</option>
                  <option value="OWNER">OWNER — full access</option>
                </select>

                <button
                  type="button"
                  className="primary-btn"
                  disabled={!email.trim()}
                  onClick={handleShare}
                >
                  Grant Access
                </button>
              </div>
            )}

            <div style={{ marginTop: '24px' }}>
              <div style={sectionHeaderStyle}>
                <Users color="var(--status-healthy)" />
                <h2 style={{ margin: 0 }}>Current team</h2>
              </div>

              {teamLoading ? (
                <div style={emptyStyle}>Loading team...</div>
              ) : team.length === 0 ? (
                <div style={emptyStyle}>No team data available.</div>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {team.map((member) => (
                    <div key={member.user_id} style={teamRowStyle}>
                      <div>
                        <strong>{member.full_name || member.email}</strong>
                        <p style={mutedTextStyle}>{member.email}</p>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={roleBadgeStyle}>
                          <ShieldCheck size={13} />
                          {member.role}
                        </span>

                        {canManageSelectedField && member.role !== 'OWNER' && (
                          <button
                            type="button"
                            onClick={() => handleRevoke(member.user_id)}
                            style={dangerButtonStyle}
                          >
                            <Trash2 size={14} />
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(280px, 420px) 1fr',
  gap: '22px'
};

const panelStyle = {
  padding: '24px',
  borderRadius: '22px'
};

const sectionHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  marginBottom: '16px'
};

const fieldCardStyle = {
  width: '100%',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  textAlign: 'left',
  padding: '14px',
  borderRadius: '14px',
  border: '1px solid var(--border-color)',
  background: 'rgba(255,255,255,0.035)',
  color: 'var(--text-primary)',
  cursor: 'pointer'
};

const teamRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '12px',
  padding: '14px',
  borderRadius: '14px',
  border: '1px solid var(--border-color)',
  background: 'rgba(255,255,255,0.035)'
};

const roleBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  padding: '6px 9px',
  borderRadius: '999px',
  background: 'rgba(59,130,246,0.12)',
  color: 'var(--accent-color)',
  fontSize: '0.72rem',
  fontWeight: 800
};

const inputStyle = {
  width: '100%',
  padding: '12px',
  borderRadius: '12px',
  border: '1px solid var(--border-color)',
  background: 'rgba(0,0,0,0.18)',
  color: 'var(--text-primary)',
  outline: 'none'
};

const noticeStyle = {
  padding: '14px',
  borderRadius: '14px',
  border: '1px solid var(--border-color)',
  background: 'rgba(148,163,184,0.08)',
  color: 'var(--text-secondary)',
  marginBottom: '16px'
};

const emptyStyle = {
  padding: '24px',
  color: 'var(--text-secondary)',
  textAlign: 'center'
};

const mutedTextStyle = {
  margin: '4px 0 0',
  color: 'var(--text-secondary)',
  fontSize: '0.85rem'
};

const dangerButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '7px 10px',
  borderRadius: '10px',
  border: '1px solid rgba(239,68,68,0.45)',
  background: 'rgba(239,68,68,0.08)',
  color: '#fca5a5',
  cursor: 'pointer',
  fontWeight: 700
};