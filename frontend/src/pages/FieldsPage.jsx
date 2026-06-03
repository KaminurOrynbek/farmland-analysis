import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { fetchAllFields, fetchAnalysisHistory } from '../api/client';
import PaginationControls from '../components/common/PaginationControls';
import { APP_PAGES } from '../constants/appPages';
import { formatAreaMeasure } from '../utils/analysisFormatters';
import {
  buildFieldWorkspaceSummaries,
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
  { value: 'risk', label: 'Priority' },
  { value: 'area', label: 'Area' },
  { value: 'name', label: 'Name' }
];

const PAGE_SIZE = 10;
const FIELD_TABLE_COLUMNS = [
  { key: 'field', label: 'Field', align: 'left' },
  { key: 'priority', label: 'Priority', align: 'left' },
  { key: 'area', label: 'Area', align: 'left' },
  { key: 'lastAnalysis', label: 'Last analysis', align: 'left' },
  { key: 'runs', label: 'Runs', align: 'left' },
  { key: 'owner', label: 'Owner', align: 'left' },
  { key: 'actions', label: 'Actions', align: 'right' }
];

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

const getRiskAccentColor = (riskLabel) => {
  if (riskLabel === 'Low') return 'var(--status-healthy)';
  if (riskLabel === 'Medium') return 'var(--status-warning)';
  if (riskLabel === 'High') return 'var(--status-critical)';
  return 'var(--border-color)';
};

const getLatestAnalysisDate = (summary) => (
  summary.latestOverallAnalysis?.analysisDate ||
  summary.latestAnalysisAt ||
  null
);

const getLatestCropType = (summary) => (
  summary.latestOverallAnalysis?.predictedClass ||
  summary.latestAnalysis?.predictedClass ||
  null
);

const formatAnalysisDate = (value) => {
  if (!value) {
    return 'Date unavailable';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return 'Date unavailable';
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

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

const shouldShowAccessRoleBadge = (accessRole) => (
  accessRole !== 'OWNER' && accessRole !== 'ADMIN'
);

const formatRunCountLabel = (count) => `${count} ${count === 1 ? 'run' : 'runs'}`;

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

function TableHeader() {
  return (
    <div
      className="fields-directory-table-header"
      style={{
        ...tableGridStyle,
        ...tableHeaderRowStyle,
      }}
    >
      {FIELD_TABLE_COLUMNS.map((column) => (
        <span
          key={column.key}
          style={{
            ...tableHeaderLabelStyle,
            textAlign: column.align
          }}
        >
          {column.label}
        </span>
      ))}
    </div>
  );
}

function TableCell({ label, className = '', children, align = 'left' }) {
  return (
    <div
      className={`fields-directory-cell ${className}`.trim()}
      style={{
        ...tableCellStyle,
        alignItems: align === 'right' ? 'flex-end' : 'flex-start',
        textAlign: align
      }}
    >
      <span className="fields-directory-mobile-label" style={mobileLabelStyle}>
        {label}
      </span>
      {children}
    </div>
  );
}

function FieldRow({ item, onOpenWorkspace, onViewResult }) {
  const hasLatestAnalysis = Boolean(item.latestOverallAnalysis);
  const analysisCount = item.analyses?.length || 0;
  const latestAnalysisDateLabel = hasLatestAnalysis
    ? formatAnalysisDate(item.latestAnalysisDate)
    : 'No analysis yet';
  const latestAnalysisTypeLabel = item.latestCropType || 'Detected cover unavailable';

  return (
    <article
      className="fields-directory-table-row"
      style={{
        ...tableGridStyle,
        ...fieldRowStyle,
        borderLeft: `3px solid ${getRiskAccentColor(item.latestRiskLabel)}`
      }}
    >
      <TableCell label="Field" className="fields-directory-field-cell">
        <div style={fieldIdentityStackStyle}>
          <strong style={fieldTitleStyle}>{getFieldName(item.field)}</strong>
          {shouldShowAccessRoleBadge(item.accessRole) ? (
            <span style={accessRoleBadgeStyle}>{item.accessRoleLabel}</span>
          ) : null}
        </div>
      </TableCell>

      <TableCell label="Priority">
        <span className={`status-pill ${getRiskTone(item.latestRiskLabel)}`}>
          {item.latestRiskLabel}
        </span>
      </TableCell>

      <TableCell label="Area">
        <strong style={cellValueStyle}>{formatAreaMeasure(item.field.area_ha)}</strong>
      </TableCell>

      <TableCell label="Last analysis" className="fields-directory-latest-cell">
        <div style={analysisStackStyle}>
          <span
            style={{
              ...cellValueStyle,
              color: hasLatestAnalysis ? 'var(--text-primary)' : 'var(--text-secondary)'
            }}
          >
            {latestAnalysisDateLabel}
          </span>
          {hasLatestAnalysis ? (
            <span style={analysisSublineStyle}>{latestAnalysisTypeLabel}</span>
          ) : null}
        </div>
      </TableCell>

      <TableCell label="Runs">
        <strong style={cellValueStyle}>{formatRunCountLabel(analysisCount)}</strong>
      </TableCell>

      <TableCell label="Owner">
        <span style={cellValueStyle}>
          {item.ownerDisplay || 'Owner information unavailable'}
        </span>
      </TableCell>

      <TableCell label="Actions" className="fields-directory-actions-cell" align="right">
        <div className="fields-directory-actions-wrap" style={fieldActionsWrapStyle}>
          <button
            type="button"
            className="secondary-btn fields-directory-action-btn fields-directory-action-btn--workspace"
            onClick={onOpenWorkspace}
            style={compactButtonStyle}
          >
            Workspace
          </button>
          <button
            type="button"
            className={hasLatestAnalysis
              ? 'primary-btn fields-directory-action-btn fields-directory-action-btn--result'
              : 'secondary-btn fields-directory-action-btn fields-directory-action-btn--disabled'}
            onClick={onViewResult}
            disabled={!hasLatestAnalysis}
            title={hasLatestAnalysis ? undefined : 'No result'}
            style={compactButtonStyle}
          >
            {hasLatestAnalysis ? 'Results' : 'No result'}
          </button>
        </div>
      </TableCell>
    </article>
  );
}

export default function FieldsPage({
  user,
  backendHealthy,
  onNavigate,
  refreshKey,
  onOpenField,
  onOpenAnalysis,
  onCreateField
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
    if (typeof onCreateField === 'function') {
      onCreateField();
      return;
    }

    onNavigate(APP_PAGES.WORKSPACE);
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
    onNavigate(APP_PAGES.ANALYSIS_RESULTS);
  };

  const hasAnyFields = fieldItems.length > 0;

  return (
    <div className="content-page">
      <div className="fields-page">
        <section className="page-hero glass-panel">
          <div>
            <div className="page-kicker">FIELD INVENTORY</div>
            <h1 className="page-title">Your fields</h1>
            <p className="page-subtitle">
              Review saved parcels, latest analysis status, and open the next action.
            </p>
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
                placeholder="Search by field, owner, crop, or priority"
                style={controlInputStyle}
              />
            </FilterField>

            <FilterField label="Priority">
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

        <section className="glass-panel fields-directory-list-panel" style={listPanelStyle}>
          {loading ? (
            <div className="empty-state">Loading fields...</div>
          ) : !hasAnyFields ? (
            <div className="empty-state">
              No fields are available yet. Open the Workspace to upload or draw a field boundary.
            </div>
          ) : visibleFieldItems.length === 0 ? (
            <div className="empty-state">
              No fields match the current tab, search, or filters.
            </div>
          ) : (
            <>
              <div className="fields-directory-list" style={fieldListStyle}>
                <TableHeader />

                {paginatedFieldItems.map((item) => (
                  <FieldRow
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
  border: '1px solid var(--border-heavy)',
  background: 'var(--surface-1)',
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
  background: 'var(--surface-contrast-soft)',
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
  background: 'var(--surface-4)',
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
  gap: '10px',
  minWidth: 0
};

const tableGridStyle = {
  display: 'grid',
  gridTemplateColumns: [
    'minmax(180px, 1.9fr)',
    'minmax(96px, 0.85fr)',
    'minmax(92px, 0.8fr)',
    'minmax(136px, 1.15fr)',
    'minmax(72px, 0.65fr)',
    'minmax(140px, 0.95fr)',
    'minmax(172px, 1.1fr)'
  ].join(' '),
  alignItems: 'center',
  gap: '12px',
  minWidth: 0
};

const tableHeaderRowStyle = {
  padding: '0 18px 4px',
  color: 'var(--text-secondary)'
};

const tableHeaderLabelStyle = {
  display: 'block',
  width: '100%',
  fontSize: '0.74rem',
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.08em'
};

const fieldRowStyle = {
  padding: '12px 18px',
  borderRadius: '16px',
  border: '1px solid var(--border-muted)',
  background: 'var(--surface-highlight-1)'
};

const tableCellStyle = {
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  gap: '4px',
  justifyContent: 'center'
};

const mobileLabelStyle = {
  fontSize: '0.72rem',
  fontWeight: 800,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em'
};

const fieldIdentityStackStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  flexWrap: 'wrap'
};

const fieldTitleStyle = {
  fontSize: '1.02rem',
  display: 'block',
  minWidth: 0,
  overflowWrap: 'anywhere'
};

const accessRoleBadgeStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '3px 8px',
  borderRadius: '999px',
  background: 'var(--border-muted)',
  border: '1px solid var(--border-muted)',
  color: 'var(--text-secondary)',
  fontSize: '0.72rem',
  fontWeight: 700
};

const cellValueStyle = {
  fontSize: '0.9rem',
  lineHeight: 1.25,
  overflowWrap: 'anywhere'
};

const analysisStackStyle = {
  display: 'grid',
  gap: '2px'
};

const analysisSublineStyle = {
  fontSize: '0.82rem',
  lineHeight: 1.2,
  color: 'var(--text-secondary)',
  overflowWrap: 'anywhere'
};

const fieldActionsWrapStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '8px',
  width: '100%',
  minWidth: 0
};

const compactButtonStyle = {
  width: '100%',
  minWidth: 0,
  padding: '7px 10px',
  fontSize: '0.78rem',
  lineHeight: 1.1,
  whiteSpace: 'nowrap'
};
