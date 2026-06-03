import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  MapPin,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  Trash2,
  Users
} from 'lucide-react';
import { APP_PAGES } from '../constants/appPages';
import PaginationControls from '../components/common/PaginationControls';
import {
  fetchAllFields,
  fetchFieldTeam,
  revokeFieldAccess,
  shareField
} from '../api/client';

const PAGE_SIZE = 8;

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'All roles' },
  { value: 'OWNER', label: 'Owner' },
  { value: 'EDITOR', label: 'Editor' },
  { value: 'VIEWER', label: 'Viewer' },
  { value: 'ADMIN', label: 'Admin' }
];

const SHARE_ROLE_OPTIONS = [
  {
    value: 'VIEWER',
    label: 'VIEWER — view only',
    helper: 'Can view field data and reports.'
  },
  {
    value: 'EDITOR',
    label: 'EDITOR — analyze and edit',
    helper: 'Can update field data and run analysis.'
  },
  {
    value: 'OWNER',
    label: 'OWNER — full access',
    helper: 'Can manage field sharing and permissions.'
  }
];

const formatArea = (value) => (
  value ? `${Number(value).toFixed(2)} ha` : 'Area unknown'
);

const getRoleTone = (role) => {
  if (role === 'OWNER' || role === 'ADMIN') return 'healthy';
  if (role === 'EDITOR') return 'warning';
  return 'neutral';
};

const getRoleDescription = (role) => {
  if (role === 'OWNER') return 'Full access and sharing management';
  if (role === 'EDITOR') return 'Can analyze and edit this field';
  if (role === 'VIEWER') return 'Can view this field only';
  if (role === 'ADMIN') return 'Administrative access';
  return 'Access role unavailable';
};

export default function FieldSharingPage({ user, onNavigate }) {
  const [fields, setFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [team, setTeam] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [loading, setLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const isAgronomist = user?.role === 'AGRONOMIST';
  const isFarmer = user?.role === 'FARMER';

  const selectedField = useMemo(
    () => fields.find((field) => String(field.id) === String(selectedFieldId)),
    [fields, selectedFieldId]
  );

  const canManageSelectedField =
    selectedField?.role === 'OWNER' || user?.role === 'ADMIN';

  const filteredFields = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return fields
      .filter((field) => {
        if (roleFilter !== 'ALL' && field.role !== roleFilter) {
          return false;
        }

        if (!query) {
          return true;
        }

        return [
          field.name,
          field.owner_name,
          field.owner_email,
          field.role
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query);
      })
      .sort((left, right) => {
        const leftName = left.name || 'Unnamed Field';
        const rightName = right.name || 'Unnamed Field';
        return leftName.localeCompare(rightName);
      });
  }, [fields, roleFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredFields.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedFields = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return filteredFields.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredFields, safeCurrentPage]);

  const selectedRoleOption = SHARE_ROLE_OPTIONS.find((option) => option.value === role);

  const loadFields = useCallback(async () => {
    setLoading(true);
    setMessage('');

    try {
      const response = await fetchAllFields();
      const fieldList = response.data || [];

      setFields(fieldList);

      if (fieldList.length > 0) {
        setSelectedFieldId((current) => current || fieldList[0].id);
      } else {
        setSelectedFieldId('');
        setTeam([]);
      }
    } catch (error) {
      setMessage(error.response?.data?.detail || 'Failed to load fields.');
    } finally {
      setLoading(false);
    }
  },[])

  const loadTeam = useCallback(async (fieldId) => {
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
  },[]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadFields();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadFields]);

  useEffect(() => {
    if (!selectedFieldId) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      void loadTeam(selectedFieldId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [selectedFieldId, loadTeam]);

  const handleSelectField = (fieldId) => {
    setSelectedFieldId(fieldId);
    setMessage('');
  };

  const handleShare = async () => {
    if (!selectedFieldId || !email.trim()) {
      return;
    }

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
    if (!selectedFieldId) {
      return;
    }

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
      <style>{fieldSharingCss}</style>

      <section className="page-hero glass-panel">
        <div>
          <div className="page-kicker">{APP_PAGES.FIELD_SHARING}</div>
          <h1 className="page-title">{APP_PAGES.FIELD_SHARING}</h1>
          <p className="page-subtitle">
            {isAgronomist
              ? 'Review field access and collaborator permissions.'
              : 'Manage who can view, analyze, or edit your fields.'}
          </p>
        </div>

        <button type="button" className="secondary-btn" onClick={loadFields}>
          <RefreshCw size={16} />
          Refresh
        </button>
      </section>

      {message ? <div className="workspace-notice-banner">{message}</div> : null}

      {loading ? (
        <div className="empty-state">Loading fields...</div>
      ) : fields.length === 0 ? (
        <div className="empty-state">
          No fields available yet. Create or upload a field in Workspace first.
        </div>
      ) : (
        <div className="field-sharing-grid">
          <section className="glass-panel field-sharing-panel">
            <div className="field-sharing-section-head">
              <MapPin size={18} color="var(--accent-color)" />
              <div>
                <h2>Your accessible fields</h2>
                <p className="workspace-helper-text">
                  Choose a field to review or manage access.
                </p>
              </div>
            </div>

            <div className="field-sharing-toolbar">
              <label className="field-sharing-search">
                <Search size={15} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Search fields or owners"
                />
              </label>

              <select
                value={roleFilter}
                onChange={(event) => {
                  setRoleFilter(event.target.value);
                  setCurrentPage(1);
                }}
                className="field-sharing-select"
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {filteredFields.length === 0 ? (
              <div className="empty-state compact">
                No fields match your search or role filter.
              </div>
            ) : (
              <>
                <div className="field-sharing-field-list">
                  {paginatedFields.map((field) => {
                    const isSelected = String(selectedFieldId) === String(field.id);

                    return (
                      <button
                        key={field.id}
                        type="button"
                        onClick={() => handleSelectField(field.id)}
                        className={`field-sharing-field-card ${isSelected ? 'active' : ''}`}
                      >
                        <div>
                          <strong>{field.name || 'Unnamed Field'}</strong>
                          <p>{formatArea(field.area_ha)}</p>
                          <small>{field.owner_name || field.owner_email || 'Owner unavailable'}</small>
                        </div>

                        <span className={`status-pill ${getRoleTone(field.role)}`}>
                          {field.role || 'VIEWER'}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <PaginationControls
                  currentPage={safeCurrentPage}
                  totalItems={filteredFields.length}
                  pageSize={PAGE_SIZE}
                  onPageChange={setCurrentPage}
                  itemLabel="fields"
                />
              </>
            )}

            <button
              type="button"
              className="secondary-btn field-sharing-workspace-btn"
              onClick={() => onNavigate?.(APP_PAGES.WORKSPACE)}
            >
              Open Workspace
            </button>
          </section>

          <section className="glass-panel field-sharing-panel">
            <div className="field-sharing-section-head">
              <Share2 size={18} color="var(--accent-color)" />
              <div>
                <h2>{isFarmer ? 'Share selected field' : 'Selected field access'}</h2>
                <p className="workspace-helper-text">
                  Selected field: <strong>{selectedField?.name || '—'}</strong>
                </p>
              </div>
            </div>

            {selectedField ? (
              <div className="field-sharing-summary">
                <div>
                  <span>Current role</span>
                  <strong>{selectedField.role || 'VIEWER'}</strong>
                  <p>{getRoleDescription(selectedField.role)}</p>
                </div>

                <div>
                  <span>Area</span>
                  <strong>{formatArea(selectedField.area_ha)}</strong>
                  <p>{selectedField.owner_name || selectedField.owner_email || 'Owner unavailable'}</p>
                </div>
              </div>
            ) : null}

            {!canManageSelectedField ? (
              <div className="workspace-note-card">
                {isAgronomist
                  ? 'You can review this field access, but only the OWNER can grant or revoke permissions.'
                  : 'You can view this field, but only OWNER can manage team access.'}
              </div>
            ) : (
              <div className="field-sharing-form">
                <label>
                  <span>User email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="example@email.com"
                  />
                </label>

                <label>
                  <span>Access role</span>
                  <select
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                  >
                    {SHARE_ROLE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <small>{selectedRoleOption?.helper}</small>
                </label>

                <button
                  type="button"
                  className="primary-btn"
                  disabled={!email.trim()}
                  onClick={handleShare}
                >
                  {isFarmer ? 'Share field' : 'Grant access'}
                </button>
              </div>
            )}

            <div className="field-sharing-team-section">
              <div className="field-sharing-section-head">
                <Users size={18} color="var(--status-healthy)" />
                <div>
                  <h2>Current team</h2>
                  <p className="workspace-helper-text">
                    People who currently have access to this field.
                  </p>
                </div>
              </div>

              {teamLoading ? (
                <div className="empty-state compact">Loading team...</div>
              ) : team.length === 0 ? (
                <div className="empty-state compact">No team data available.</div>
              ) : (
                <div className="field-sharing-team-list">
                  {team.map((member) => (
                    <article key={member.user_id} className="field-sharing-team-row">
                      <div>
                        <strong>{member.full_name || member.email}</strong>
                        <p>{member.email}</p>
                      </div>

                      <div className="field-sharing-team-actions">
                        <span className={`status-pill ${getRoleTone(member.role)}`}>
                          <ShieldCheck size={13} />
                          {member.role}
                        </span>

                        {canManageSelectedField && member.role !== 'OWNER' ? (
                          <button
                            type="button"
                            onClick={() => handleRevoke(member.user_id)}
                            className="field-sharing-danger-btn"
                          >
                            <Trash2 size={14} />
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </article>
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

const fieldSharingCss = `
  .field-sharing-grid {
    display: grid;
    grid-template-columns: minmax(320px, 430px) minmax(0, 1fr);
    gap: 22px;
    align-items: start;
  }

  .field-sharing-panel {
    padding: 24px;
    border-radius: 22px;
    min-width: 0;
  }

  .field-sharing-section-head {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 16px;
  }

  .field-sharing-section-head h2 {
    margin: 0;
    font-size: 1.1rem;
  }

  .field-sharing-toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 150px;
    gap: 10px;
    margin-bottom: 14px;
  }

  .field-sharing-search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 12px;
    border-radius: 12px;
    border: 1px solid var(--border-color);
    background: var(--surface-4);
    color: var(--text-secondary);
  }

  .field-sharing-search input,
  .field-sharing-select,
  .field-sharing-form input,
  .field-sharing-form select {
    width: 100%;
    border: 0;
    outline: none;
    background: transparent;
    color: var(--text-primary);
    font: inherit;
  }

  .field-sharing-search input {
    padding: 11px 0;
  }

  .field-sharing-select,
  .field-sharing-form input,
  .field-sharing-form select {
    padding: 12px;
    border-radius: 12px;
    border: 1px solid var(--border-color);
    background: var(--surface-4);
  }

  .field-sharing-field-list {
    display: grid;
    gap: 10px;
  }

  .field-sharing-field-card {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    text-align: left;
    padding: 14px;
    border-radius: 14px;
    border: 1px solid var(--border-color);
    background: var(--surface-highlight-2);
    color: var(--text-primary);
    cursor: pointer;
    transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
  }

  .field-sharing-field-card:hover {
    background: var(--surface-highlight-1);
    transform: translateY(-1px);
  }

  .field-sharing-field-card.active {
    border-color: var(--accent-color);
    box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.35);
  }

  .field-sharing-field-card p,
  .field-sharing-field-card small,
  .field-sharing-team-row p,
  .field-sharing-summary p,
  .field-sharing-form small {
    margin: 4px 0 0;
    color: var(--text-secondary);
    font-size: 0.85rem;
  }

  .field-sharing-workspace-btn {
    margin-top: 16px;
  }

  .field-sharing-summary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-bottom: 18px;
  }

  .field-sharing-summary > div {
    padding: 14px;
    border-radius: 16px;
    border: 1px solid var(--border-color);
    background: var(--surface-highlight-2);
  }

  .field-sharing-summary span,
  .field-sharing-form span {
    display: block;
    margin-bottom: 6px;
    color: var(--text-secondary);
    font-size: 0.78rem;
    font-weight: 800;
  }

  .field-sharing-summary strong {
    display: block;
    color: var(--text-primary);
  }

  .field-sharing-form {
    display: grid;
    gap: 12px;
    margin-bottom: 22px;
  }

  .field-sharing-team-section {
    margin-top: 24px;
  }

  .field-sharing-team-list {
    display: grid;
    gap: 10px;
  }

  .field-sharing-team-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 14px;
    border-radius: 14px;
    border: 1px solid var(--border-color);
    background: var(--surface-highlight-2);
  }

  .field-sharing-team-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .field-sharing-danger-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px;
    border-radius: 10px;
    border: 1px solid rgba(239,68,68,0.45);
    background: rgba(239,68,68,0.08);
    color: var(--status-critical-muted);
    cursor: pointer;
    font-weight: 700;
  }

  @media (max-width: 1180px) {
    .field-sharing-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 720px) {
    .field-sharing-toolbar,
    .field-sharing-summary {
      grid-template-columns: 1fr;
    }

    .field-sharing-team-row {
      align-items: flex-start;
      flex-direction: column;
    }

    .field-sharing-team-actions {
      justify-content: flex-start;
    }
  }
`;