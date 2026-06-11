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
import PaginationControls from '../components/common/PaginationControls';
import {
  fetchAllFields,
  fetchFieldTeam,
  revokeFieldAccess,
  shareField
} from '../api/client';
import { getAccessRoleLabel, t } from '../i18n.js';

const PAGE_SIZE = 8;

const ROLE_METADATA = {
  VIEWER: {
    label: 'Viewer',
    helper: 'Can view reports.',
    description: 'Can view reports'
  },
  EDITOR: {
    label: 'Editor',
    helper: 'Can edit field and run analysis.',
    description: 'Can edit field and run analysis'
  },
  OWNER: {
    label: 'Owner',
    helper: 'Can manage sharing.',
    description: 'Can manage sharing'
  },
  ADMIN: {
    label: 'Admin',
    helper: 'Platform admin access.',
    description: 'Platform admin can manage sharing'
  }
};

const ROLE_OPTIONS = [
  { value: 'ALL', label: 'All access levels' },
  { value: 'OWNER', label: ROLE_METADATA.OWNER.label },
  { value: 'EDITOR', label: ROLE_METADATA.EDITOR.label },
  { value: 'VIEWER', label: ROLE_METADATA.VIEWER.label }
];

const SHARE_ROLE_OPTIONS = [
  {
    value: 'VIEWER',
    label: ROLE_METADATA.VIEWER.label,
    helper: ROLE_METADATA.VIEWER.helper
  },
  {
    value: 'EDITOR',
    label: ROLE_METADATA.EDITOR.label,
    helper: ROLE_METADATA.EDITOR.helper
  },
  {
    value: 'OWNER',
    label: ROLE_METADATA.OWNER.label,
    helper: ROLE_METADATA.OWNER.helper
  }
];

const formatArea = (value) => (
  value !== null && value !== undefined && value !== ''
    ? `${Number(value).toFixed(2)} ha`
    : t('Area unknown')
);

const getRoleTone = (role) => {
  if (role === 'OWNER' || role === 'ADMIN') return 'healthy';
  if (role === 'EDITOR') return 'warning';
  return 'neutral';
};

const getRoleMeta = (role) => (
  ROLE_METADATA[role] || {
    label: role || 'Unknown role',
    helper: 'Access details unavailable.',
    description: 'Access details unavailable'
  }
);

export default function FieldSharingPage({ user }) {
  const isAdminUser = user?.role === 'ADMIN';
  const [fields, setFields] = useState([]);
  const [selectedFieldId, setSelectedFieldId] = useState('');
  const [team, setTeam] = useState([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('VIEWER');
  const [loading, setLoading] = useState(true);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamMessage, setTeamMessage] = useState('');
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const selectedField = useMemo(
    () => fields.find((field) => String(field.id) === String(selectedFieldId)),
    [fields, selectedFieldId]
  );

  const canManageSelectedField =
    selectedField?.role === 'OWNER' ||
    selectedField?.role === 'ADMIN' ||
    user?.role === 'ADMIN';

  const filteredFields = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return fields
      .filter((field) => {
        if (!isAdminUser && roleFilter !== 'ALL' && field.role !== roleFilter) {
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
        const leftName = left.name || t('Unnamed field');
        const rightName = right.name || t('Unnamed field');
        return leftName.localeCompare(rightName);
      });
  }, [fields, isAdminUser, roleFilter, searchQuery]);

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
        setSelectedFieldId((current) => {
          if (fieldList.some((field) => String(field.id) === String(current))) {
            return current;
          }

          return fieldList[0].id;
        });
      } else {
        setSelectedFieldId('');
        setTeam([]);
        setTeamMessage('');
      }
    } catch (error) {
      setMessage(t(error.response?.data?.detail || 'Failed to load fields.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTeam = useCallback(async (fieldId) => {
    if (!fieldId) {
      setTeam([]);
      setTeamMessage('');
      return;
    }

    setTeamLoading(true);
    setTeamMessage('');

    try {
      const response = await fetchFieldTeam(fieldId);
      setTeam(Array.isArray(response) ? response : []);
      setTeamMessage('');
    } catch (error) {
      setTeam([]);
      setTeamMessage(
        t(error.response?.data?.detail ||
          'Unable to load the current access list for this field.')
      );
    } finally {
      setTeamLoading(false);
    }
  }, []);

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

      setMessage(t(result.message || 'Field shared successfully.'));
      setEmail('');
      setRole('VIEWER');
      await loadTeam(selectedFieldId);
    } catch (error) {
      setMessage(t(error.response?.data?.detail || 'Failed to share field.'));
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
      setMessage(t(error.response?.data?.detail || 'Failed to revoke access.'));
    }
  };

  return (
    <div className="content-page field-sharing-page">
      <style>{fieldSharingCss}</style>

      <section className="page-hero glass-panel field-sharing-hero">
        <div>
          <div className="page-kicker">{t('ACCESS CONTROL')}</div>
          <h1 className="page-title">{t('Share field access')}</h1>
          <p className="page-subtitle">{t('Manage who can view, analyze, or edit saved fields.')}</p>
        </div>

        <button type="button" className="secondary-btn" onClick={loadFields}>
          <RefreshCw size={16} />
          {t('Refresh')}
        </button>
      </section>

      {message ? <div className="workspace-notice-banner">{message}</div> : null}

      {loading ? (
        <div className="empty-state">{t('Loading fields...')}</div>
      ) : fields.length === 0 ? (
        <div className="empty-state">
          {t('No fields available yet. Create or upload a field in Workspace first.')}
        </div>
      ) : (
        <div className="field-sharing-grid">
          <section className="glass-panel field-sharing-panel field-sharing-panel--sidebar">
            <div className="field-sharing-section-head">
              <MapPin size={18} color="var(--accent-color)" />
              <div>
                <h2>{t('Accessible fields')}</h2>
                <p className="workspace-helper-text">
                  {t('Choose a saved field to review access and sharing permissions.')}
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
                  placeholder={t('Search fields or owners')}
                />
              </label>

              {!isAdminUser ? (
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
                      {t(option.label)}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            {filteredFields.length === 0 ? (
              <div className="empty-state compact">
                {t('No fields match your search or role filter.')}
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
                        <div className="field-sharing-field-card-main">
                          <div className="field-sharing-field-card-head">
                            <strong>{field.name || t('Unnamed field')}</strong>
                            {isSelected ? (
                              <span className="field-sharing-selected-badge">{t('Selected')}</span>
                            ) : null}
                          </div>
                          <p>{formatArea(field.area_ha)}</p>
                        </div>

                        

                        <div className="field-sharing-field-card-side">
                          <small>{t('Owner')}</small>
                          <strong>{field.owner_name || field.owner_email || t('Unknown')}</strong>
                        </div>
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
          </section>

          <section className="glass-panel field-sharing-panel field-sharing-panel--main">
            <div className="field-sharing-section-head">
              <Users size={18} color="var(--status-healthy)" />
              <div>
                <h2>{t('People with access')}</h2>
                <p className="workspace-helper-text">
                  {t('Review who can currently open and work with this saved field.')}
                </p>
              </div>
            </div>

            {teamLoading ? (
              <div className="empty-state compact">{t('Loading people with access...')}</div>
            ) : teamMessage ? (
              <div className="workspace-note-card field-sharing-readonly-card">
                {teamMessage}
              </div>
            ) : team.length === 0 ? (
              <div className="empty-state compact">{t('No access records are available for this field.')}</div>
            ) : (
              <div className="field-sharing-team-list">
                {team.map((member) => {
                  const memberRoleMeta = getRoleMeta(member.role);
                  const canRemoveMember =
                    canManageSelectedField &&
                    member.role !== 'OWNER' &&
                    member.role !== 'ADMIN';

                  return (
                    <article key={member.user_id} className="field-sharing-team-row">
                      <div className="field-sharing-member-meta">
                        <strong>{member.full_name || member.email}</strong>
                        <p>{member.email}</p>
                        <small>{memberRoleMeta.helper}</small>
                      </div>

                      <div className="field-sharing-team-actions">
                        <span className={`status-pill ${getRoleTone(member.role)}`}>
                          <ShieldCheck size={13} />
                          {getAccessRoleLabel(member.role)}
                        </span>

                        {canRemoveMember ? (
                          <button
                            type="button"
                            onClick={() => handleRevoke(member.user_id)}
                            className="field-sharing-danger-btn"
                          >
                            <Trash2 size={14} />
                            {t('Remove access')}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            <div className="field-sharing-invite-section">
              <div className="field-sharing-section-head">
                <Share2 size={18} color="var(--accent-color)" />
                <div>
                  <h2>{t('Invite people')}</h2>
                  <p className="workspace-helper-text">
                    {t('Owners and platform Admins can add people or change access.')}
                  </p>
                </div>
              </div>

              {!canManageSelectedField ? (
                <div className="workspace-note-card field-sharing-readonly-card">
                  <strong>{t('Read-only access.')}</strong>{' '}
                  {t('Your current role is {role}. Only a field Owner or platform Admin can invite people or remove access.', {
                    role: getAccessRoleLabel(selectedField?.role)
                  })}
                </div>
              ) : (
                <div className="field-sharing-form">
                  <label className="field-sharing-form-field">
                    <span>{t('Email address')}</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@example.com"
                    />
                  </label>

                  <div className="field-sharing-form-field">
                    <span>{t('Choose access level')}</span>
                    <div className="field-sharing-role-grid" role="radiogroup" aria-label={t('Access role')}>
                      {SHARE_ROLE_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setRole(option.value)}
                          className={`field-sharing-role-card ${role === option.value ? 'active' : ''}`}
                          aria-pressed={role === option.value}
                        >
                          <strong>{t(option.label)}</strong>
                          <small>{t(option.helper)}</small>
                        </button>
                      ))}
                    </div>
                    <small className="field-sharing-role-selection-note">
                      {t('Selected role: {role}. {helper}', {
                        role: t(selectedRoleOption?.label || ''),
                        helper: t(selectedRoleOption?.helper || '')
                      })}
                    </small>
                  </div>

                  <button
                    type="button"
                    className="primary-btn"
                    disabled={!email.trim()}
                    onClick={handleShare}
                  >
                    {t('Send invite')}
                  </button>
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
  .field-sharing-page {
    overflow-x: hidden;
  }

  .field-sharing-hero {
    flex-wrap: wrap;
  }

  .field-sharing-grid {
    display: grid;
    grid-template-columns: minmax(320px, 390px) minmax(0, 1fr);
    gap: 22px;
    align-items: start;
    min-width: 0;
  }

  .field-sharing-panel {
    display: grid;
    gap: 22px;
    padding: 24px;
    border-radius: 22px;
    min-width: 0;
    overflow: hidden;
    background:
      linear-gradient(180deg, var(--surface-elevated-strong), var(--surface-7)),
      var(--glass-bg);
    border-color: var(--border-muted);
  }

  .field-sharing-section-head {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    min-width: 0;
  }

  .field-sharing-section-head h2 {
    margin: 0;
    font-size: 1.1rem;
  }

  .field-sharing-panel--main {
    align-content: start;
  }

  .field-sharing-toolbar {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
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
    min-width: 0;
  }

  .field-sharing-search input,
  .field-sharing-select,
  .field-sharing-form input {
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
  .field-sharing-form input {
    padding: 12px;
    border-radius: 12px;
    border: 1px solid var(--border-color);
    background: var(--surface-4);
  }

  .field-sharing-field-list {
    display: grid;
    gap: 12px;
  }

  .field-sharing-field-card {
    width: 100%;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(92px, auto);
    align-items: flex-start;
    gap: 12px;
    text-align: left;
    padding: 14px;
    border-radius: 18px;
    border: 1px solid var(--border-color);
    background: var(--surface-3);
    color: var(--text-primary);
    cursor: pointer;
    overflow: hidden;
    transition:
      border-color 0.2s ease,
      background 0.2s ease,
      box-shadow 0.2s ease,
      transform 0.2s ease;
  }

  .field-sharing-field-card:hover {
    background: var(--surface-highlight-2);
    transform: translateY(-1px);
  }

  .field-sharing-field-card.active {
    border-color: rgba(59, 130, 246, 0.62);
    background:
      linear-gradient(180deg, rgba(59, 130, 246, 0.14), transparent),
      var(--surface-highlight-2);
    box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.3), 0 18px 34px rgba(15, 23, 42, 0.14);
  }

  .field-sharing-field-card-main,
  .field-sharing-member-meta {
    min-width: 0;
  }

  .field-sharing-field-card-head {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .field-sharing-field-card strong,
  .field-sharing-selected-summary h3,
  .field-sharing-member-meta strong {
    word-break: break-word;
  }

  .field-sharing-field-card-side {
    display: grid;
    gap: 6px;
    justify-items: end;
    text-align: right;
    min-width: 0;
  }

  .field-sharing-selected-badge {
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 999px;
    background: rgba(59, 130, 246, 0.14);
    border: 1px solid rgba(59, 130, 246, 0.24);
    color: var(--accent-color);
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .field-sharing-field-card p,
  .field-sharing-field-card small,
  .field-sharing-team-row p,
  .field-sharing-team-row small,
  .field-sharing-detail-card p,
  .field-sharing-form small {
    margin: 4px 0 0;
    color: var(--text-secondary);
    font-size: 0.85rem;
    word-break: break-word;
  }.field-sharing-form-field > span {
  display: block;
  margin-bottom: 6px;
  color: var(--text-secondary);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
  .field-sharing-form {
    display: grid;
    gap: 16px;
  }

  .field-sharing-form-field {
    display: grid;
    gap: 8px;
  }

  .field-sharing-role-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    min-width: 0;
  }

  .field-sharing-role-card {
    display: grid;
    gap: 6px;
    text-align: left;
    padding: 14px;
    border-radius: 16px;
    border: 1px solid var(--border-color);
    background: var(--surface-highlight-3);
    color: var(--text-primary);
    cursor: pointer;
    transition:
      border-color 0.2s ease,
      background 0.2s ease,
      box-shadow 0.2s ease,
      transform 0.2s ease;
  }

  .field-sharing-role-card:hover {
    border-color: rgba(59, 130, 246, 0.34);
    transform: translateY(-1px);
  }

  .field-sharing-role-card.active {
    border-color: rgba(59, 130, 246, 0.65);
    background: rgba(59, 130, 246, 0.12);
    box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.28);
  }

  .field-sharing-role-card strong {
    font-size: 0.95rem;
  }

  .field-sharing-role-card small,
  .field-sharing-role-selection-note {
    color: var(--text-secondary);
    line-height: 1.55;
  }

  .field-sharing-role-selection-note strong {
    color: var(--text-primary);
  }

  .field-sharing-team-list {
    display: grid;
    gap: 10px;
  }

  .field-sharing-team-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    padding: 14px;
    border-radius: 16px;
    border: 1px solid var(--border-color);
    background: var(--surface-3);
    min-width: 0;
  }

  .field-sharing-team-actions {
    display: grid;
    gap: 8px;
    justify-content: flex-end;
    justify-items: end;
    min-width: 0;
  }

  .field-sharing-invite-section {
    display: grid;
    gap: 16px;
    padding-top: 4px;
    border-top: 1px solid var(--border-soft);
  }

  .field-sharing-readonly-card {
    line-height: 1.65;
  }

  .field-sharing-danger-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 10px;
    border-radius: 10px;
    border: 1px solid rgba(239, 68, 68, 0.45);
    background: rgba(239, 68, 68, 0.08);
    color: var(--status-critical-muted);
    cursor: pointer;
    font-weight: 700;
    white-space: nowrap;
    transition: background 0.18s ease, border-color 0.18s ease;
  }

  .field-sharing-danger-btn:hover {
    background: rgba(239, 68, 68, 0.14);
    border-color: rgba(239, 68, 68, 0.55);
  }

  @media (max-width: 1180px) {
    .field-sharing-grid {
      grid-template-columns: 1fr;
    }

    .field-sharing-summary-grid,
    .field-sharing-role-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 720px) {
    .field-sharing-panel {
      padding: 18px;
      gap: 18px;
    }

    .field-sharing-toolbar,
    .field-sharing-field-card,
    .field-sharing-team-row {
      grid-template-columns: 1fr;
    }

    .field-sharing-field-card-side,
    .field-sharing-team-actions {
      justify-items: start;
      text-align: left;
    }

    .field-sharing-hero {
      flex-direction: column;
      align-items: stretch;
    }
  }
`;
