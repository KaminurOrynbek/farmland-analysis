import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { fetchAllFields, fetchAnalysisHistory } from '../api/client';
import PaginationControls from '../components/common/PaginationControls';
import { formatAreaMeasure } from '../utils/analysisFormatters';
import {
  buildFieldWorkspaceSummaries,
  formatWorkspaceDateTime,
  getRiskTone,
  sortAnalysesByNewest
} from '../utils/fieldAnalysisUtils';

const FIELD_TABS = [
  { id: 'all', label: 'All Fields' },
  { id: 'owned', label: 'Owned by me' },
  { id: 'shared', label: 'Shared with me' }
];

const RISK_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Not analyzed', label: 'Not analyzed' }
];

const ACCESS_ROLE_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'OWNER', label: 'Owner' },
  { value: 'EDITOR', label: 'Editor' },
  { value: 'VIEWER', label: 'Viewer' },
  { value: 'ADMIN', label: 'Admin' }
];

const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest analysis' },
  { value: 'risk', label: 'Risk level' },
  { value: 'area', label: 'Area' },
  { value: 'name', label: 'Name' }
];

const PAGE_SIZE = 10;

const RISK_ORDER = {
  High: 3,
  Medium: 2,
  Low: 1,
  'Not analyzed': 0
};

const getAccessRoleLabel = (role) => {
  if (role === 'OWNER') return 'Owner';
  if (role === 'EDITOR') return 'Editor';
  if (role === 'VIEWER') return 'Viewer';
  if (role === 'ADMIN') return 'Admin';
  return 'Unknown';
};

const getFieldName = (field) => field?.name || 'Unnamed field';

const getLatestRiskLabel = (summary) => summary.latestRisk || 'Not analyzed';

const getLatestAnalysisDate = (summary) => (
  summary.latestOverallAnalysis?.analysis_date ||
  summary.latestAnalysisAt ||
  null
);

const getLatestCropType = (summary) => (
  summary.latestOverallAnalysis?.crop_type ||
  summary.latestAnalysis?.crop_type ||
  null
);

const isFieldOwnedByUser = (field, user) => {
  if (field?.owner_id && user?.id) {
    return String(field.owner_id) === String(user.id);
  }

  return field?.role === 'OWNER';
};

const matchesTab = (item, activeTab) => {
  if (activeTab === 'owned') {
    return item.isOwned;
  }

  if (activeTab === 'shared') {
    return !item.isOwned;
  }

  return true;
};

const matchesSearch = (item, query) => {
  if (!query) {
    return true;
  }

  const searchableText = [
    getFieldName(item.field),
    item.ownerDisplay,
    item.field.owner_name,
    item.field.owner_email,
    item.latestCropType,
    item.latestRiskLabel
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return searchableText.includes(query);
};

const matchesRisk = (item, riskFilter) => (
  riskFilter === 'ALL' || item.latestRiskLabel === riskFilter
);

const matchesAccessRole = (item, roleFilter) => (
  roleFilter === 'ALL' || item.accessRole === roleFilter
);

const compareBySort = (left, right, sortBy) => {
  if (sortBy === 'name') {
    return getFieldName(left.field).localeCompare(getFieldName(right.field));
  }

  if (sortBy === 'area') {
    const areaDifference = Number(right.field.area_ha || 0) - Number(left.field.area_ha || 0);
    return areaDifference || getFieldName(left.field).localeCompare(getFieldName(right.field));
  }

  if (sortBy === 'risk') {
    const riskDifference =
      (RISK_ORDER[right.latestRiskLabel] || 0) - (RISK_ORDER[left.latestRiskLabel] || 0);

    if (riskDifference !== 0) {
      return riskDifference;
    }
  }

  const rightTime = new Date(right.latestAnalysisDate || 0).getTime();
  const leftTime = new Date(left.latestAnalysisDate || 0).getTime();

  if (rightTime !== leftTime) {
    return rightTime - leftTime;
  }

  return getFieldName(left.field).localeCompare(getFieldName(right.field));
};

function TabButton({ item, count, isActive, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        ...tabButtonStyle,
        ...(isActive ? activeTabButtonStyle : null)
      }}
    >
      <span>{item.label}</span>
      <span style={tabCountStyle}>{count}</span>
    </button>
  );
}

function FilterField({ label, children }) {
  return (
    <label style={filterFieldStyle}>
      <span style={filterLabelStyle}>{label}</span>
      {children}
    </label>
  );
}

function FieldCard({ item, onOpenWorkspace, onViewResult }) {
  const hasLatestAnalysis = Boolean(item.latestOverallAnalysis);

  return (
    <article style={fieldRowStyle}>
      <div style={fieldPrimaryColumnStyle}>
        <div style={fieldHeaderStyle}>
          <strong style={fieldTitleStyle}>{getFieldName(item.field)}</strong>
          <span className={`status-pill ${getRiskTone(item.latestRiskLabel)}`}>
            {item.latestRiskLabel}
          </span>
        </div>

        <p className="workspace-helper-text" style={fieldOwnerStyle}>
          {item.ownerDisplay ? `Owner: ${item.ownerDisplay}` : 'Owner information unavailable'}
        </p>
      </div>

      <div style={fieldMetaRowStyle}>
        <div style={fieldMetaItemStyle}>
          <span style={fieldMetaLabelStyle}>Area</span>
          <strong>{formatAreaMeasure(item.field.area_ha)}</strong>
        </div>

        <div style={fieldMetaItemStyle}>
          <span style={fieldMetaLabelStyle}>Access role</span>
          <strong>{item.accessRoleLabel}</strong>
        </div>

        <div style={fieldMetaItemStyle}>
          <span style={fieldMetaLabelStyle}>Latest analysis</span>
          <strong>{formatWorkspaceDateTime(item.latestAnalysisDate, 'No analysis yet')}</strong>
        </div>

        <div style={fieldMetaItemStyle}>
          <span style={fieldMetaLabelStyle}>Crop type</span>
          <strong>{item.latestCropType || '—'}</strong>
        </div>
      </div>

      <div style={fieldActionsColumnStyle}>
        <button
          type="button"
          className="secondary-btn"
          onClick={onOpenWorkspace}
        >
          Open Workspace
        </button>
        <button
          type="button"
          className="primary-btn"
          onClick={onViewResult}
          disabled={!hasLatestAnalysis}
        >
          {hasLatestAnalysis ? 'View Result' : 'No result yet'}
        </button>
      </div>
    </article>
  );
}

export default function ProjectsPage({
  user,
  backendHealthy,
  onNavigate,
  refreshKey,
  onOpenField,
  onOpenAnalysis,
  onCreateProject
}) {
  const [fields, setFields] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('ALL');
  const [accessRoleFilter, setAccessRoleFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('latest');
  const [currentPage, setCurrentPage] = useState(1);

  const canCreateField = user?.role === 'ADMIN' || user?.role === 'FARMER';
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  useEffect(() => {
    let isActive = true;

    const loadFieldsPageData = async () => {
      setLoading(true);

      const [fieldsResponse, historyResponse] = await Promise.allSettled([
        fetchAllFields(),
        fetchAnalysisHistory()
      ]);

      if (!isActive) {
        return;
      }

      if (fieldsResponse.status === 'fulfilled') {
        setFields(fieldsResponse.value.data || []);
      } else {
        setFields([]);
      }

      if (historyResponse.status === 'fulfilled') {
        setHistory(sortAnalysesByNewest(historyResponse.value.data || []));
      } else {
        setHistory([]);
      }

      const hasFailure =
        fieldsResponse.status === 'rejected' ||
        historyResponse.status === 'rejected';

      if (hasFailure) {
        setNotice(
          backendHealthy
            ? 'Some field records could not be refreshed. Showing the latest available data.'
            : 'Backend is not connected. Showing the latest local field context where possible.'
        );
      } else {
        setNotice('');
      }

      setLoading(false);
    };

    void loadFieldsPageData();

    return () => {
      isActive = false;
    };
  }, [backendHealthy, refreshKey]);

  const fieldSummaries = useMemo(
    () => buildFieldWorkspaceSummaries(fields, history),
    [fields, history]
  );

  const fieldItems = useMemo(() => (
    fieldSummaries.map((summary) => {
      const ownerDisplay =
        summary.field.owner_name ||
        summary.field.owner_email ||
        (isFieldOwnedByUser(summary.field, user) ? 'You' : null);

      return {
        ...summary,
        isOwned: isFieldOwnedByUser(summary.field, user),
        latestAnalysisDate: getLatestAnalysisDate(summary),
        latestRiskLabel: getLatestRiskLabel(summary),
        latestCropType: getLatestCropType(summary),
        accessRole: summary.field.role || 'UNKNOWN',
        accessRoleLabel: getAccessRoleLabel(summary.field.role),
        ownerDisplay
      };
    })
  ), [fieldSummaries, user]);

  const tabCounts = useMemo(() => ({
    all: fieldItems.length,
    owned: fieldItems.filter((item) => item.isOwned).length,
    shared: fieldItems.filter((item) => !item.isOwned).length
  }), [fieldItems]);

  const visibleFieldItems = useMemo(() => (
    fieldItems
      .filter((item) => matchesTab(item, activeTab))
      .filter((item) => matchesSearch(item, normalizedSearchQuery))
      .filter((item) => matchesRisk(item, riskFilter))
      .filter((item) => matchesAccessRole(item, accessRoleFilter))
      .sort((left, right) => compareBySort(left, right, sortBy))
  ), [
    activeTab,
    accessRoleFilter,
    fieldItems,
    normalizedSearchQuery,
    riskFilter,
    sortBy
  ]);

  const totalPages = Math.max(1, Math.ceil(visibleFieldItems.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedFieldItems = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return visibleFieldItems.slice(startIndex, startIndex + PAGE_SIZE);
  }, [safeCurrentPage, visibleFieldItems]);

  const handleAddField = () => {
    if (typeof onCreateProject === 'function') {
      onCreateProject();
      return;
    }

    onNavigate('Workspace');
  };

  const handleOpenWorkspace = (item) => {
    onOpenField(item.field, item.latestOverallAnalysis);
  };

  const handleViewResult = (item) => {
    const preferredAnalysis = item.latestOverallAnalysis;

    if (preferredAnalysis) {
      onOpenAnalysis(preferredAnalysis, item.field);
      return;
    }

    onOpenField(item.field, null, { navigate: false });
    onNavigate('Analysis Report');
  };

  const hasAnyFields = fieldItems.length > 0;

  return (
    <div className="content-page">
      <section className="page-hero glass-panel">
        <div>
          <div className="page-kicker">Field Directory</div>
          <h1 className="page-title">Fields</h1>
        </div>

        {canCreateField ? (
          <button
            type="button"
            className="primary-btn"
            onClick={handleAddField}
          >
            <Plus size={16} />
            Add Field
          </button>
        ) : null}
      </section>

      {notice ? (
        <div className="workspace-notice-banner">{notice}</div>
      ) : null}

      <section className="glass-panel" style={toolbarPanelStyle}>
        <div style={tabsRowStyle}>
          {FIELD_TABS.map((tab) => (
            <TabButton
              key={tab.id}
              item={tab}
              count={tabCounts[tab.id] || 0}
              isActive={activeTab === tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentPage(1);
              }}
            />
          ))}
        </div>

        <div style={filtersGridStyle}>
          <FilterField label="Search">
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by field, owner, crop, or risk"
              style={controlInputStyle}
            />
          </FilterField>

          <FilterField label="Risk">
            <select
              value={riskFilter}
              onChange={(event) => {
                setRiskFilter(event.target.value);
                setCurrentPage(1);
              }}
              style={controlInputStyle}
            >
              {RISK_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Access role">
            <select
              value={accessRoleFilter}
              onChange={(event) => {
                setAccessRoleFilter(event.target.value);
                setCurrentPage(1);
              }}
              style={controlInputStyle}
            >
              {ACCESS_ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>

          <FilterField label="Sort by">
            <select
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value);
                setCurrentPage(1);
              }}
              style={controlInputStyle}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </FilterField>
        </div>

        {loading ? (
          <div className="workspace-helper-text">Loading field records...</div>
        ) : null}
      </section>

      <section className="glass-panel" style={listPanelStyle}>
        {loading ? (
          <div className="empty-state">Loading fields...</div>
        ) : !hasAnyFields ? (
          <div className="empty-state">
            No fields are available yet. Open Workspace to upload or draw a field boundary.
          </div>
        ) : visibleFieldItems.length === 0 ? (
          <div className="empty-state">
            No fields match the current tab, search, or filters.
          </div>
        ) : (
          <>
            <div style={fieldListStyle}>
              {paginatedFieldItems.map((item) => (
                <FieldCard
                  key={item.field.id}
                  item={item}
                  onOpenWorkspace={() => handleOpenWorkspace(item)}
                  onViewResult={() => handleViewResult(item)}
                />
              ))}
            </div>

            <PaginationControls
              currentPage={safeCurrentPage}
              totalItems={visibleFieldItems.length}
              pageSize={PAGE_SIZE}
              onPageChange={setCurrentPage}
              itemLabel="fields"
            />
          </>
        )}
      </section>
    </div>
  );
}

const toolbarPanelStyle = {
  padding: '18px',
  borderRadius: '20px',
  display: 'grid',
  gap: '16px'
};

const tabsRowStyle = {
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap'
};

const tabButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 16px',
  borderRadius: '999px',
  border: '1px solid rgba(148, 163, 184, 0.28)',
  background: 'rgba(15, 23, 42, 0.24)',
  color: 'var(--text-primary)',
  fontWeight: 700,
  cursor: 'pointer',
  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.02)'
};

const activeTabButtonStyle = {
  background: 'rgba(59, 130, 246, 0.22)',
  color: 'var(--text-primary)',
  borderColor: 'rgba(96, 165, 250, 0.9)',
  boxShadow: '0 0 0 1px rgba(96, 165, 250, 0.3), 0 12px 24px rgba(59, 130, 246, 0.12)'
};

const tabCountStyle = {
  minWidth: '30px',
  fontSize: '0.82rem',
  fontWeight: 800,
  padding: '4px 10px',
  borderRadius: '999px',
  background: 'rgba(2, 6, 23, 0.5)',
  color: 'inherit',
  textAlign: 'center'
};

const filtersGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '12px'
};

const filterFieldStyle = {
  display: 'grid',
  gap: '8px'
};

const filterLabelStyle = {
  fontSize: '0.78rem',
  fontWeight: 700,
  color: 'var(--text-secondary)'
};

const controlInputStyle = {
  width: '100%',
  padding: '11px 12px',
  borderRadius: '12px',
  background: 'rgba(15, 23, 42, 0.45)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  outline: 'none'
};

const listPanelStyle = {
  padding: '18px',
  borderRadius: '20px'
};

const fieldListStyle = {
  display: 'grid',
  gap: '12px'
};

const fieldRowStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1.8fr) auto',
  gap: '16px',
  alignItems: 'center',
  padding: '16px 18px',
  borderRadius: '16px',
  border: '1px solid var(--border-color)',
  background: 'rgba(255,255,255,0.02)'
};

const fieldPrimaryColumnStyle = {
  minWidth: 0
};

const fieldHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '12px'
};

const fieldTitleStyle = {
  fontSize: '1rem',
  display: 'block',
  minWidth: 0
};

const fieldOwnerStyle = {
  margin: '6px 0 0'
};

const fieldMetaRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px'
};

const fieldMetaItemStyle = {
  display: 'grid',
  gap: '4px',
  minWidth: '120px'
};

const fieldMetaLabelStyle = {
  fontSize: '0.72rem',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em'
};

const fieldActionsColumnStyle = {
  display: 'grid',
  gap: '10px',
  justifyItems: 'end'
};
