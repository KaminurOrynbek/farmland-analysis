import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  ChevronRight,
  Clock3,
  Database,
  ShieldCheck,
  Users
} from 'lucide-react';
import {
  fetchAdminAudit,
  fetchAdminStats,
  fetchAllFields,
  fetchAnalysisHistory
} from '../api/client';
import { APP_PAGES } from '../constants/appPages';

const formatDateTime = (value) => {
  if (!value) {
    return 'No recent activity';
  }

  return new Date(value).toLocaleString();
};

const formatWeekday = (value) => (
  new Date(value).toLocaleDateString(undefined, { weekday: 'short' })
);

const formatArea = (value) => {
  const numeric = Number(value || 0);
  return `${numeric.toFixed(2)} ha`;
};

const getFieldList = (response) => response?.data || [];
const getAnalysisList = (response) => response?.data || [];
const getAuditList = (response) => (Array.isArray(response) ? response : response?.data || []);

const getRiskTone = (riskLevel) => {
  if (riskLevel === 'High') return 'critical';
  if (riskLevel === 'Medium') return 'warning';
  if (riskLevel === 'Low') return 'healthy';
  return 'neutral';
};

const getRoleLabel = (role) => {
  if (role === 'OWNER') return 'Owned';
  if (role === 'EDITOR') return 'Shared editor';
  if (role === 'VIEWER') return 'Shared viewer';
  if (role === 'ADMIN') return 'Admin view';
  return role || 'Access granted';
};

const buildLatestFieldAnalyses = (history) => {
  const latestByField = new Map();

  history.forEach((item) => {
    const fieldKey = item?.field_id || item?.field_name;
    if (!fieldKey || latestByField.has(fieldKey)) {
      return;
    }

    latestByField.set(fieldKey, item);
  });

  return Array.from(latestByField.values());
};

const countUniqueBy = (items, keyBuilder) => (
  new Set(items.map(keyBuilder).filter(Boolean)).size
);

const sumSeries = (items = []) => (
  items.reduce((sum, item) => sum + Number(item?.count || 0), 0)
);

const SummaryCard = ({ label, value, helper, icon, tone }) => (
  <div className="metric-card glass-panel">
    <div className="metric-card-top">
      <span className="metric-label">{label}</span>
      {React.cloneElement(icon, { size: 18, color: tone })}
    </div>
    <div className="metric-value">{value}</div>
    <div className="metric-helper">{helper}</div>
  </div>
);

const QuickAction = ({ title, text, icon, onClick }) => (
  <button
    type="button"
    className="action-card glass-panel"
    onClick={onClick}
  >
    <div className="action-card-icon">
      {icon}
    </div>
    <div className="action-card-copy">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
    <ChevronRight size={18} color="var(--text-secondary)" />
  </button>
);

const AnalyticsCard = ({ kicker, title, helper, icon, children }) => (
  <div className="analytics-card glass-panel">
    <div className="analytics-card-head">
      <div>
        <div className="section-kicker">{kicker}</div>
        <h3 className="analytics-card-title">{title}</h3>
        {helper ? <p className="analytics-card-copy">{helper}</p> : null}
      </div>
      <div className="analytics-card-icon">{icon}</div>
    </div>
    {children}
  </div>
);

const TrendChartCard = ({ kicker, title, helper, icon, series = [] }) => {
  const maxValue = Math.max(...series.map((item) => Number(item?.count || 0)), 1);

  return (
    <AnalyticsCard
      kicker={kicker}
      title={title}
      helper={helper}
      icon={icon}
    >
      {series.length === 0 ? (
        <div className="empty-state compact">No activity yet.</div>
      ) : (
        <div style={trendChartStyle}>
          {series.map((item) => {
            const count = Number(item?.count || 0);
            const height = Math.max((count / maxValue) * 100, count > 0 ? 16 : 8);

            return (
              <div key={item.date} style={trendBarColumnStyle}>
                <span style={trendValueStyle}>{count}</span>
                <div style={trendTrackStyle}>
                  <div style={{ ...trendFillStyle, height: `${height}%` }} />
                </div>
                <span style={trendLabelStyle}>{formatWeekday(item.date)}</span>
              </div>
            );
          })}
        </div>
      )}
    </AnalyticsCard>
  );
};

export default function DashboardPage({
  user,
  backendHealthy,
  onNavigate,
  refreshKey,
  latestAnalysisAt
}) {
  const [fields, setFields] = useState([]);
  const [history, setHistory] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;

    const loadDashboardData = async () => {
      setLoading(true);
      setError('');

      const [fieldsResult, historyResult, statsResult, auditResult] = await Promise.allSettled([
        fetchAllFields(),
        fetchAnalysisHistory(),
        fetchAdminStats(),
        fetchAdminAudit()
      ]);

      if (!isActive) {
        return;
      }

      if (fieldsResult.status === 'fulfilled') {
        setFields(getFieldList(fieldsResult.value));
      } else {
        setFields([]);
      }

      if (historyResult.status === 'fulfilled') {
        const sortedHistory = [...getAnalysisList(historyResult.value)].sort(
          (left, right) => new Date(right.analysis_date) - new Date(left.analysis_date)
        );
        setHistory(sortedHistory);
      } else {
        setHistory([]);
      }

      if (statsResult.status === 'fulfilled') {
        setAdminStats(statsResult.value);
      } else {
        setAdminStats(null);
      }

      if (auditResult.status === 'fulfilled') {
        setAuditLogs(getAuditList(auditResult.value));
      } else {
        setAuditLogs([]);
      }

      const firstRejected = [fieldsResult, historyResult, statsResult, auditResult].find(
        (result) => result.status === 'rejected'
      );

      if (firstRejected?.status === 'rejected') {
        setError(firstRejected.reason?.response?.data?.detail || 'Some dashboard data could not be loaded.');
      }

      setLoading(false);
    };

    void loadDashboardData();

    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  const derivedData = useMemo(() => {
    const fieldById = Object.fromEntries(fields.map((field) => [field.id, field]));
    const accessibleTotalArea = fields.reduce((sum, field) => sum + Number(field?.area_ha || 0), 0);
    const latestHistoryItem = history[0] || null;
    const latestFieldAnalyses = buildLatestFieldAnalyses(history).map((item) => ({
      ...item,
      field: fieldById[item.field_id] || null
    }));
    const highRiskFields = latestFieldAnalyses.filter((item) => item?.risk_level === 'High');
    const largestFields = [...fields]
      .sort((left, right) => Number(right?.area_ha || 0) - Number(left?.area_ha || 0))
      .slice(0, 6);
    const analyzedFieldCount = countUniqueBy(
      latestFieldAnalyses,
      (item) => item?.field_id || item?.field_name
    );

    return {
      accessibleTotalArea,
      averageFieldArea: fields.length > 0 ? accessibleTotalArea / fields.length : 0,
      latestHistoryItem,
      latestFieldAnalyses,
      highRiskFields,
      largestFields,
      analyzedFieldCount,
      recentHistory: history.slice(0, 6),
      recentAudit: auditLogs.slice(0, 6)
    };
  }, [auditLogs, fields, history]);

  const weeklyStats = adminStats?.weekly || {
    field_creations: [],
    analysis_runs: [],
    user_registrations: []
  };

  const roleBreakdown = adminStats?.role_breakdown || {};
  const latestPlatformDate = latestAnalysisAt || derivedData.latestHistoryItem?.analysis_date;

  const summaryCards = [
    {
      label: 'System Users',
      value: loading ? '...' : adminStats?.summary?.users ?? 0,
      helper: `+${sumSeries(weeklyStats.user_registrations)} registered in the last 7 days`,
      icon: <Users />,
      tone: 'var(--accent-color)'
    },
    {
      label: 'Fields Created',
      value: loading ? '...' : adminStats?.summary?.fields ?? fields.length,
      helper: `+${sumSeries(weeklyStats.field_creations)} created this week`,
      icon: <Database />,
      tone: 'var(--status-healthy)'
    },
    {
      label: 'Analyses Run',
      value: loading ? '...' : adminStats?.summary?.analyses ?? history.length,
      helper: `+${sumSeries(weeklyStats.analysis_runs)} started this week`,
      icon: <BarChart3 />,
      tone: '#8b5cf6'
    },
    {
      label: 'Blocked Users',
      value: loading ? '...' : adminStats?.summary?.blocked_users ?? 0,
      helper: 'Accounts currently disabled by administrators',
      icon: <ShieldCheck />,
      tone: 'var(--status-warning)'
    }
  ];

  const quickActions = [
    {
      title: 'Open Admin Panel',
      text: 'Manage users, update roles, block accounts, and handle platform administration.',
      icon: <ShieldCheck size={18} color="var(--accent-color)" />,
      onClick: () => onNavigate(APP_PAGES.ADMIN_PANEL)
    },
    {
      title: 'Review fields',
      text: 'Open the fields workspace to inspect what has been created and analyzed across the platform.',
      icon: <Database size={18} color="var(--status-healthy)" />,
      onClick: () => onNavigate(APP_PAGES.FIELDS)
    },
    {
      title: 'Review audit logs',
      text: 'Inspect recent account, field, comment, and analysis events captured across the platform.',
      icon: <Clock3 size={18} color="#8b5cf6" />,
      onClick: () => onNavigate(APP_PAGES.ADMIN_PANEL)
    }
  ];

  const primaryAttentionFields = derivedData.highRiskFields.length > 0
    ? derivedData.highRiskFields
    : derivedData.largestFields;

  return (
    <div className="content-page">
      <section className="page-hero glass-panel">
        <div>
          <div className="page-kicker">System Dashboard</div>
          <h1 className="page-title">{`Welcome back, ${user?.full_name || user?.name || 'Admin'}`}</h1>
          <p className="page-subtitle">
            Review platform growth, user operations, and the analysis pipeline from one admin-only dashboard.
          </p>
        </div>

        <div className="page-hero-meta">
          <div className="page-hero-meta-card">
            <span className="page-hero-meta-label">Latest analysis</span>
            <strong>{formatDateTime(latestPlatformDate)}</strong>
          </div>
          <div className="page-hero-meta-card">
            <span className="page-hero-meta-label">Backend status</span>
            <strong>{backendHealthy ? 'Connected' : 'Unavailable'}</strong>
          </div>
          <div className="page-hero-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={() => onNavigate(APP_PAGES.ADMIN_PANEL)}
            >
              Open Admin Panel
            </button>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => onNavigate(APP_PAGES.FIELDS)}
            >
              Review fields
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="glass-panel" style={errorStyle}>
          {error}
        </div>
      ) : null}

      <section className="metric-grid">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </section>

      <section className="dashboard-analytics-grid">
        <TrendChartCard
          kicker="Weekly Growth"
          title="Fields created over the last 7 days"
          helper="Daily field creation volume visible to the full platform."
          icon={<Database size={18} color="var(--accent-color)" />}
          series={weeklyStats.field_creations}
        />

        <TrendChartCard
          kicker="Pipeline Activity"
          title="Analyses launched this week"
          helper="These counts track new analysis jobs started by day."
          icon={<BarChart3 size={18} color="#8b5cf6" />}
          series={weeklyStats.analysis_runs}
        />

        <TrendChartCard
          kicker="User Growth"
          title="Registrations in the last 7 days"
          helper="New user accounts entering the system each day."
          icon={<Users size={18} color="var(--status-healthy)" />}
          series={weeklyStats.user_registrations}
        />
      </section>

      <section className="split-panel-grid">
        <div className="section-card glass-panel">
          <div className="section-card-header">
            <div>
              <div className="section-kicker">Role Distribution</div>
              <h2>Who is using the platform</h2>
            </div>
          </div>

          <div style={roleGridStyle}>
            {[
              { label: 'Admins', value: roleBreakdown.ADMIN ?? 0 },
              { label: 'Farmers', value: roleBreakdown.FARMER ?? 0 },
              { label: 'Agronomists', value: roleBreakdown.AGRONOMIST ?? 0 }
            ].map((item) => (
              <div key={item.label} style={roleCardStyle}>
                <span style={roleCardLabelStyle}>{item.label}</span>
                <strong style={roleCardValueStyle}>{loading ? '...' : item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="section-card glass-panel">
          <div className="section-card-header">
            <div>
              <div className="section-kicker">Audit Logs</div>
              <h2>Latest platform activity</h2>
            </div>
          </div>

          {derivedData.recentAudit.length === 0 && !loading ? (
            <div className="empty-state">
              Audit entries will appear here after admin actions, field updates, comments, or analysis runs.
            </div>
          ) : (
            <div className="stack-list">
              {derivedData.recentAudit.map((log) => (
                <div key={log.id} className="list-row">
                  <div>
                    <strong>{log.action || 'Unknown action'}</strong>
                    <p>
                      {(log.entity_type || 'entity').toUpperCase()} · {formatDateTime(log.created_at)}
                    </p>
                  </div>
                  <Clock3 size={16} color="var(--text-secondary)" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="split-panel-grid">
        <div className="section-card glass-panel">
          <div className="section-card-header">
            <div>
              <div className="section-kicker">Quick Actions</div>
              <h2>Operations shortcuts</h2>
            </div>
          </div>

          <div className="action-grid">
            {quickActions.map((action) => (
              <QuickAction key={action.title} {...action} />
            ))}
          </div>
        </div>

        <div className="section-card glass-panel">
          <div className="section-card-header">
            <div>
              <div className="section-kicker">Platform Snapshot</div>
              <h2>What the system says right now</h2>
            </div>
          </div>

          <div className="stack-list">
            <div className="stack-row">
              <span>Platform field area</span>
              <strong>{loading ? '...' : formatArea(derivedData.accessibleTotalArea)}</strong>
            </div>
            <div className="stack-row">
              <span>Fields with recent analyses</span>
              <strong>{loading ? '...' : derivedData.analyzedFieldCount}</strong>
            </div>
            <div className="stack-row">
              <span>Average field area</span>
              <strong>{loading ? '...' : formatArea(derivedData.averageFieldArea)}</strong>
            </div>
            <div className="stack-row">
              <span>Recent audit entries</span>
              <strong>{loading ? '...' : derivedData.recentAudit.length}</strong>
            </div>
            <div className="stack-row">
              <span>Admins on platform</span>
              <strong>{loading ? '...' : roleBreakdown.ADMIN ?? 0}</strong>
            </div>
            <div className="stack-row">
              <span>Backend</span>
              <strong>{backendHealthy ? 'Connected' : 'Unavailable'}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="split-panel-grid">
        <div className="section-card glass-panel">
          <div className="section-card-header">
            <div>
              <div className="section-kicker">Attention Queue</div>
              <h2>Fields that need attention</h2>
            </div>
          </div>

          {primaryAttentionFields.length === 0 ? (
            <div className="empty-state">
              No platform field data is available yet.
            </div>
          ) : (
            <div className="stack-list">
              {primaryAttentionFields.map((item) => {
                const fieldName =
                  item.field_name ||
                  item.name ||
                  item.field?.name ||
                  'Unnamed field';
                const detailLine = item.risk_level
                  ? `${item.crop_type || 'Unknown crop'} · NDVI ${item.ndvi_value !== null && item.ndvi_value !== undefined ? Number(item.ndvi_value).toFixed(3) : '—'} · ${formatDateTime(item.analysis_date)}`
                  : `${formatArea(item.area_ha)} · ${getRoleLabel(item.role)}`;
                const badgeLabel = item.risk_level || (item.role === 'ADMIN' ? 'Admin view' : 'View');
                const tone = item.risk_level ? getRiskTone(item.risk_level) : 'neutral';

                return (
                  <div key={item.analysis_id || item.id || fieldName} className="list-row">
                    <div>
                      <strong>{fieldName}</strong>
                      <p>{detailLine}</p>
                    </div>
                    <span className={`status-pill ${tone}`}>{badgeLabel}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="section-card glass-panel">
          <div className="section-card-header">
            <div>
              <div className="section-kicker">Platform Activity</div>
              <h2>Latest completed analyses</h2>
            </div>
          </div>

          {derivedData.recentHistory.length === 0 ? (
            <div className="empty-state">
              No completed analyses yet. Run or review an analysis to populate this activity feed.
            </div>
          ) : (
            <div className="stack-list">
              {derivedData.recentHistory.map((item) => (
                <div key={item.analysis_id} className="list-row">
                  <div>
                    <strong>{item.field_name || 'Unnamed field'}</strong>
                    <p>
                      {item.crop_type || 'Unknown crop'} · {item.risk_level || 'Unknown risk'} · {formatDateTime(item.analysis_date)}
                    </p>
                  </div>
                  <Clock3 size={16} color="var(--text-secondary)" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

const errorStyle = {
  padding: '14px 16px',
  borderRadius: '14px',
  color: 'var(--status-critical-soft)',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  background: 'rgba(239, 68, 68, 0.08)'
};

const trendChartStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  gap: '10px',
  alignItems: 'end',
  minHeight: '180px'
};

const trendBarColumnStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px'
};

const trendValueStyle = {
  fontSize: '0.78rem',
  color: 'var(--text-secondary)'
};

const trendTrackStyle = {
  width: '100%',
  height: '120px',
  borderRadius: '999px',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  background: 'var(--surface-3)',
  border: '1px solid var(--border-soft)',
  padding: '6px'
};

const trendFillStyle = {
  width: '100%',
  borderRadius: '999px',
  background: 'linear-gradient(180deg, rgba(96, 165, 250, 0.95), rgba(59, 130, 246, 0.45))',
  minHeight: '8px'
};

const trendLabelStyle = {
  fontSize: '0.74rem',
  color: 'var(--text-secondary)'
};

const roleGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '12px'
};

const roleCardStyle = {
  padding: '16px',
  borderRadius: '18px',
  border: '1px solid var(--border-muted)',
  background: 'var(--surface-1)',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
};

const roleCardLabelStyle = {
  color: 'var(--text-secondary)',
  fontSize: '0.74rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em'
};

const roleCardValueStyle = {
  fontSize: '1.45rem',
  lineHeight: 1
};
