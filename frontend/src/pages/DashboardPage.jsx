import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Clock3,
  Database,
  ShieldCheck,
  Users
} from 'lucide-react';
import {
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

const getFieldList = (response) => response?.data || [];
const getAnalysisList = (response) => response?.data || [];

const getRiskTone = (riskLevel) => {
  if (riskLevel === 'Critical' || riskLevel === 'High') return 'critical';
  if (riskLevel === 'Medium') return 'warning';
  if (riskLevel === 'Low') return 'healthy';
  return 'neutral';
};

const isAttentionRisk = (riskLevel) => riskLevel === 'High' || riskLevel === 'Critical';

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

const sumSeries = (items = []) => (
  items.reduce((sum, item) => sum + Number(item?.count || 0), 0)
);

const SummaryCard = ({ label, value, helper, icon, tone }) => (
  <div className="metric-card glass-panel dashboard-metric-card">
    <div className="metric-card-top">
      <span className="metric-label">{label}</span>
      {React.cloneElement(icon, { size: 18, color: tone })}
    </div>
    <div className="metric-value">{value}</div>
    <div className="metric-helper">{helper}</div>
  </div>
);

const AnalyticsCard = ({ kicker, title, helper, icon, children, className = '' }) => (
  <div className={`analytics-card glass-panel ${className}`.trim()}>
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
      className="dashboard-chart-card"
    >
      {series.length === 0 ? (
        <div className="empty-state compact">No activity yet.</div>
      ) : (
        <div className="dashboard-trend-chart">
          {series.map((item) => {
            const count = Number(item?.count || 0);
            const height = Math.max((count / maxValue) * 100, count > 0 ? 16 : 8);

            return (
              <div key={item.date} className="dashboard-trend-column">
                <span className="dashboard-trend-value">{count}</span>
                <div className="dashboard-trend-track">
                  <div className="dashboard-trend-fill" style={{ height: `${height}%` }} />
                </div>
                <span className="dashboard-trend-label">{formatWeekday(item.date)}</span>
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
  onNavigate,
  refreshKey,
  latestAnalysisAt
}) {
  const [fields, setFields] = useState([]);
  const [history, setHistory] = useState([]);
  const [adminStats, setAdminStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let isActive = true;

    const loadDashboardData = async () => {
      setLoading(true);
      setError('');

      const [fieldsResult, historyResult, statsResult] = await Promise.allSettled([
        fetchAllFields(),
        fetchAnalysisHistory(),
        fetchAdminStats()
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

      const firstRejected = [fieldsResult, historyResult, statsResult].find(
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
    const latestHistoryItem = history[0] || null;
    const latestFieldAnalyses = buildLatestFieldAnalyses(history).map((item) => ({
      ...item,
      field: fieldById[item.field_id] || null
    }));
    const attentionQueue = latestFieldAnalyses
      .filter((item) => isAttentionRisk(item?.risk_level))
      .sort((left, right) => {
        const leftRank = left?.risk_level === 'Critical' ? 2 : 1;
        const rightRank = right?.risk_level === 'Critical' ? 2 : 1;

        if (rightRank !== leftRank) {
          return rightRank - leftRank;
        }

        return new Date(right.analysis_date) - new Date(left.analysis_date);
      })
      .slice(0, 6);

    return {
      latestHistoryItem,
      priorityFieldCount: attentionQueue.length,
      attentionQueue,
      recentHistory: history.slice(0, 6)
    };
  }, [fields, history]);

  const weeklyStats = adminStats?.weekly || {
    field_creations: [],
    analysis_runs: [],
    user_registrations: []
  };

  const latestPlatformDate = latestAnalysisAt || derivedData.latestHistoryItem?.analysis_date;

  const summaryCards = [
    {
      label: 'System Users',
      value: loading ? '...' : adminStats?.summary?.users ?? 0,
      helper: `${sumSeries(weeklyStats.user_registrations)} registered in the last 7 days`,
      icon: <Users />,
      tone: 'var(--accent-color)'
    },
    {
      label: 'Fields Created',
      value: loading ? '...' : adminStats?.summary?.fields ?? fields.length,
      helper: `${sumSeries(weeklyStats.field_creations)} created in the last 7 days`,
      icon: <Database />,
      tone: 'var(--status-healthy)'
    },
    {
      label: 'Analyses Run',
      value: loading ? '...' : adminStats?.summary?.analyses ?? history.length,
      helper: `${sumSeries(weeklyStats.analysis_runs)} launched this week`,
      icon: <BarChart3 />,
      tone: '#8b5cf6'
    },
    {
      label: 'Priority Fields',
      value: loading ? '...' : derivedData.priorityFieldCount,
      helper: 'Latest analyses marked High or Critical',
      icon: <AlertTriangle />,
      tone: 'var(--status-critical)'
    }
  ];

  return (
    <div className="content-page dashboard-page">
      <style>{dashboardPageCss}</style>

      <section className="page-hero glass-panel dashboard-hero">
        <div className="dashboard-hero-copy">
          <div className="page-kicker">SYSTEM DASHBOARD</div>
          <h1 className="page-title">{`Welcome back, ${user?.full_name || user?.name || 'Admin'}`}</h1>
          <p className="page-subtitle">
            Review platform activity and the analysis pipeline.
          </p>
        </div>

        <div className="dashboard-hero-side">
          <div className="dashboard-hero-activity-card">
            <div>
              <span className="dashboard-hero-status-label">Latest analysis</span>
              <strong>{formatDateTime(latestPlatformDate)}</strong>
            </div>
            <Clock3 size={18} color="var(--text-secondary)" />
          </div>

          <div className="page-hero-actions dashboard-hero-actions">
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
        <div className="glass-panel dashboard-error-banner">
          {error}
        </div>
      ) : null}

      <section className="metric-grid dashboard-metric-grid">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </section>

      <section className="dashboard-analytics-grid dashboard-chart-grid">
        <TrendChartCard
          kicker="Fields"
          title="Fields created over last 7 days"
          helper="Daily field creation volume across the platform."
          icon={<Database size={18} color="var(--accent-color)" />}
          series={weeklyStats.field_creations}
        />

        <TrendChartCard
          kicker="Pipeline"
          title="Analyses launched this week"
          helper="New analysis jobs started by day."
          icon={<BarChart3 size={18} color="#8b5cf6" />}
          series={weeklyStats.analysis_runs}
        />

        <TrendChartCard
          kicker="Users"
          title="Registrations in the last 7 days"
          helper="New accounts created each day."
          icon={<Users size={18} color="var(--status-healthy)" />}
          series={weeklyStats.user_registrations}
        />
      </section>

      <section className="dashboard-bottom-grid">
        <div className="section-card glass-panel dashboard-section-card">
          <div className="dashboard-section-header">
            <div className="dashboard-section-heading">
              <div className="section-kicker">Attention Queue</div>
              <h2>Fields with High/Critical inspection priority</h2>
            </div>
            <AlertTriangle size={18} color="var(--status-critical)" />
          </div>

          {derivedData.attentionQueue.length === 0 ? (
            <div className="empty-state">
              No fields are currently marked High or Critical.
            </div>
          ) : (
            <div className="dashboard-list">
              {derivedData.attentionQueue.map((item) => {
                const fieldName = item.field_name || item.field?.name || 'Unnamed field';

                return (
                  <div key={item.analysis_id || fieldName} className="dashboard-list-row">
                    <div className="dashboard-list-copy">
                      <strong>{fieldName}</strong>
                      <p>
                        {item.crop_type || 'Unknown crop'} · NDVI{' '}
                        {item.ndvi_value !== null && item.ndvi_value !== undefined
                          ? Number(item.ndvi_value).toFixed(3)
                          : '—'}{' '}
                        · {formatDateTime(item.analysis_date)}
                      </p>
                    </div>
                    <span className={`status-pill ${getRiskTone(item.risk_level)}`}>
                      {item.risk_level}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="section-card glass-panel dashboard-section-card">
          <div className="dashboard-section-header">
            <div className="dashboard-section-heading">
              <div className="section-kicker">Latest Analyses</div>
              <h2>Latest completed analyses</h2>
            </div>
            <Clock3 size={18} color="var(--text-secondary)" />
          </div>

          {derivedData.recentHistory.length === 0 ? (
            <div className="empty-state">
              No completed analyses yet.
            </div>
          ) : (
            <div className="dashboard-list">
              {derivedData.recentHistory.map((item) => (
                <div key={item.analysis_id} className="dashboard-list-row">
                  <div className="dashboard-list-copy">
                    <strong>{item.field_name || 'Unnamed field'}</strong>
                    <p>
                      {item.crop_type || 'Unknown crop'} · {item.risk_level || 'Unknown risk'}{' '}
                      · {formatDateTime(item.analysis_date)}
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

const dashboardPageCss = `
  .dashboard-page {
    overflow-x: hidden;
  }

  .dashboard-hero {
    align-items: stretch;
    flex-wrap: wrap;
  }

  .dashboard-hero-copy {
    flex: 1 1 420px;
    min-width: 0;
  }

  .dashboard-hero-side {
    display: grid;
    gap: 14px;
    min-width: min(100%, 360px);
  }

  .dashboard-hero-activity-card {
    min-width: 0;
    padding: 18px 20px;
    border-radius: 18px;
    border: 1px solid var(--border-soft);
    background: var(--surface-2);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
  }

  .dashboard-hero-activity-card strong {
    display: block;
    margin-top: 8px;
    font-size: 1rem;
    line-height: 1.4;
  }

  .dashboard-hero-status-card {
    min-width: 0;
    padding: 16px 18px;
    border-radius: 18px;
    border: 1px solid var(--border-soft);
    background: var(--surface-2);
    display: grid;
    gap: 8px;
  }

  .dashboard-hero-status-label {
    color: var(--text-secondary);
    font-size: 0.76rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .dashboard-hero-status-card strong {
    font-size: 0.98rem;
    line-height: 1.45;
    word-break: break-word;
  }

  .dashboard-hero-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .dashboard-error-banner {
    padding: 14px 16px;
    border-radius: 14px;
    color: var(--status-critical-soft);
    border: 1px solid rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.08);
  }

  .dashboard-metric-grid,
  .dashboard-chart-grid,
  .dashboard-bottom-grid {
    min-width: 0;
  }

  .dashboard-metric-grid {
    gap: 14px;
  }

  .dashboard-metric-card {
    padding: 18px 20px;
    min-width: 0;
  }

  .dashboard-metric-card .metric-value {
    margin-top: 16px;
    font-size: 1.85rem;
  }

  .dashboard-metric-card .metric-helper {
    line-height: 1.5;
  }

  .dashboard-chart-grid {
    gap: 14px;
  }

  .dashboard-chart-card {
    padding: 18px;
    min-width: 0;
  }

  .dashboard-chart-card .analytics-card-head {
    margin-bottom: 14px;
  }

  .dashboard-chart-card .analytics-card-title {
    margin-top: 8px;
    font-size: 1rem;
  }

  .dashboard-chart-card .analytics-card-copy {
    line-height: 1.55;
  }

  .dashboard-trend-chart {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 10px;
    align-items: end;
    min-height: 152px;
    min-width: 0;
  }

  .dashboard-trend-column {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .dashboard-trend-value,
  .dashboard-trend-label {
    color: var(--text-secondary);
    font-size: 0.74rem;
  }

  .dashboard-trend-track {
    width: 100%;
    height: 104px;
    padding: 6px;
    border-radius: 999px;
    border: 1px solid var(--border-soft);
    background: var(--surface-3);
    display: flex;
    align-items: flex-end;
    justify-content: center;
  }

  .dashboard-trend-fill {
    width: 100%;
    min-height: 8px;
    border-radius: 999px;
    background: linear-gradient(180deg, rgba(96, 165, 250, 0.95), rgba(59, 130, 246, 0.45));
  }

  .dashboard-bottom-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    align-items: start;
  }

  .dashboard-section-card {
    min-width: 0;
    padding: 18px 20px;
    border-color: var(--border-muted);
    background:
      linear-gradient(180deg, var(--surface-elevated-strong), var(--surface-7)),
      var(--glass-bg);
    overflow: hidden;
  }

  .dashboard-section-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 16px;
    min-width: 0;
  }

  .dashboard-section-heading {
    min-width: 0;
  }

  .dashboard-section-heading h2 {
    margin-top: 8px;
    font-size: 1.08rem;
    letter-spacing: -0.02em;
    word-break: break-word;
  }

  .dashboard-list {
    display: grid;
    min-width: 0;
  }

  .dashboard-list-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 14px;
    padding: 14px 0;
    border-bottom: 1px solid var(--border-soft);
    min-width: 0;
  }

  .dashboard-list-row:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }

  .dashboard-list-copy {
    min-width: 0;
  }

  .dashboard-list-copy strong,
  .dashboard-list-copy p {
    word-break: break-word;
  }

  .dashboard-list-copy strong {
    font-size: 0.94rem;
  }

  .dashboard-list-copy p {
    margin-top: 4px;
    color: var(--text-secondary);
    font-size: 0.86rem;
    line-height: 1.55;
  }

  @media (max-width: 1120px) {
    .dashboard-hero-status-grid,
    .dashboard-bottom-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 760px) {
    .dashboard-hero-actions {
      width: 100%;
    }

    .dashboard-hero-actions > button {
      width: 100%;
    }

    .dashboard-metric-card,
    .dashboard-chart-card,
    .dashboard-section-card {
      padding: 16px;
    }

    .dashboard-trend-chart,
    .dashboard-list-row {
      gap: 8px;
    }

    .dashboard-list-row {
      grid-template-columns: 1fr;
    }
  }
`;
