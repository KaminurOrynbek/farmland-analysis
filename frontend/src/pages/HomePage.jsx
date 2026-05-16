import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronRight,
  Clock3,
  Database,
  LineChart,
  Map as MapIcon,
  ShieldCheck,
  Share2,
  Users,
  FileText
} from 'lucide-react';
import {
  fetchAdminAudit,
  fetchAdminStats,
  fetchAllFields,
  fetchAnalysisHistory
} from '../api/client';

const RISK_LEVELS = ['High', 'Medium', 'Low'];

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

const average = (values) => {
  if (values.length === 0) {
    return '—';
  }

  return (
    values.reduce((sum, value) => sum + value, 0) / values.length
  ).toFixed(3);
};

const countUniqueBy = (items, keyBuilder) => (
  new Set(items.map(keyBuilder).filter(Boolean)).size
);

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

const buildTopCrops = (items) => {
  const counts = items.reduce((accumulator, item) => {
    const crop = item?.crop_type;
    if (!crop) {
      return accumulator;
    }

    accumulator[crop] = (accumulator[crop] || 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4)
    .map(([label, count]) => ({ label, count }));
};

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

const QuickAction = ({ title, text, icon, onClick, accent = false }) => (
  <button
    type="button"
    className="action-card glass-panel"
    onClick={onClick}
    style={accent ? accentActionStyle : undefined}
  >
    <div className="action-card-icon" style={accent ? accentActionIconStyle : undefined}>
      {icon}
    </div>
    <div className="action-card-copy">
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
    <ChevronRight size={18} color={accent ? '#dcfce7' : 'var(--text-secondary)'} />
  </button>
);

const AnalyticsCard = ({ kicker, title, helper, icon, children }) => (
  <div className="analytics-card glass-panel">
    <div className="analytics-card-head">
      <div>
        <div className="section-kicker">{kicker}</div>
        <h3 className="analytics-card-title">{title}</h3>
        {helper && <p className="analytics-card-copy">{helper}</p>}
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

const ClientGroupCard = ({ group, onNavigate }) => (
  <div style={clientCardStyle}>
    <div style={clientCardHeaderStyle}>
      <div>
        <strong style={{ fontSize: '0.95rem' }}>{group.clientName}</strong>
        <div style={clientMetaStyle}>{group.clientEmail || 'Owner email unavailable'}</div>
      </div>
      <span className={`status-pill ${group.attentionCount > 0 ? 'warning' : 'healthy'}`}>
        {group.attentionCount > 0 ? `${group.attentionCount} attention` : 'Stable'}
      </span>
    </div>

    <div style={clientStatGridStyle}>
      <div style={clientStatStyle}>
        <span style={clientStatLabelStyle}>Fields</span>
        <strong>{group.fields.length}</strong>
      </div>
      <div style={clientStatStyle}>
        <span style={clientStatLabelStyle}>Area</span>
        <strong>{formatArea(group.totalArea)}</strong>
      </div>
      <div style={clientStatStyle}>
        <span style={clientStatLabelStyle}>High risk</span>
        <strong>{group.highRiskCount}</strong>
      </div>
    </div>

    <div style={miniListStyle}>
      {group.fields.slice(0, 3).map((field) => (
        <div key={field.id} style={miniListRowStyle}>
          <div>
            <strong>{field.name || 'Unnamed field'}</strong>
            <p style={miniListMetaStyle}>
              {formatArea(field.area_ha)} · {field.latestCrop || 'Pending crop'} · {getRoleLabel(field.role)}
            </p>
          </div>
          <span className={`status-pill ${getRiskTone(field.latestRisk)}`}>
            {field.latestRisk || 'Pending'}
          </span>
        </div>
      ))}
    </div>

    <button
      type="button"
      className="text-btn"
      onClick={() => onNavigate('Projects')}
      style={{ alignSelf: 'flex-start' }}
    >
      Open client fields
    </button>
  </div>
);

export default function HomePage({
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

  const isAdmin = user?.role === 'ADMIN';
  const isAgronomist = user?.role === 'AGRONOMIST';
  const isFarmer = user?.role === 'FARMER';

  useEffect(() => {
    let isActive = true;

    const loadDashboardData = async () => {
      setLoading(true);
      setError('');

      const requests = [
        fetchAllFields(),
        fetchAnalysisHistory(),
        isAdmin ? fetchAdminStats() : Promise.resolve(null),
        isAdmin ? fetchAdminAudit() : Promise.resolve([])
      ];

      const [fieldsResult, historyResult, statsResult, auditResult] = await Promise.allSettled(requests);

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

      if (isAdmin) {
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
      } else {
        setAdminStats(null);
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
  }, [isAdmin, refreshKey]);

  const derivedData = useMemo(() => {
    const fieldById = Object.fromEntries(fields.map((field) => [field.id, field]));
    const accessibleTotalArea = fields.reduce((sum, field) => sum + Number(field?.area_ha || 0), 0);
    const ownedFields = fields.filter((field) => field?.role === 'OWNER');
    const sharedFields = fields.filter(
      (field) => field?.role && field.role !== 'OWNER' && field.role !== 'ADMIN'
    );
    const editableFields = fields.filter(
      (field) => field?.role === 'OWNER' || field?.role === 'EDITOR'
    );
    const ownTotalArea = ownedFields.reduce((sum, field) => sum + Number(field?.area_ha || 0), 0);
    const ndviValues = history
      .map((item) => item?.ndvi_value)
      .filter((value) => value !== null && value !== undefined);

    const latestHistoryItem = history[0] || null;
    const latestFieldAnalyses = buildLatestFieldAnalyses(history).map((item) => ({
      ...item,
      field: fieldById[item.field_id] || null
    }));

    const latestAnalysisByFieldId = Object.fromEntries(
      latestFieldAnalyses.map((item) => [item.field_id, item])
    );

    const highRiskFields = latestFieldAnalyses.filter((item) => item?.risk_level === 'High');
    const attentionFields = latestFieldAnalyses.filter(
      (item) => item?.risk_level === 'High' || item?.risk_level === 'Medium'
    );
    const ownProblemFields = latestFieldAnalyses.filter(
      (item) => item?.field?.role === 'OWNER' && item?.risk_level === 'High'
    );
    const averageArea = fields.length > 0 ? accessibleTotalArea / fields.length : 0;
    const riskDistribution = RISK_LEVELS.map((level) => ({
      level,
      count: latestFieldAnalyses.filter((item) => item?.risk_level === level).length
    }));
    const topCrops = buildTopCrops(latestFieldAnalyses);
    const largestFields = [...fields]
      .sort((left, right) => Number(right?.area_ha || 0) - Number(left?.area_ha || 0))
      .slice(0, 5);
    const analyzedFieldCount = countUniqueBy(latestFieldAnalyses, (item) => item?.field_id || item?.field_name);
    const clientGroups = Object.values(
      fields.reduce((accumulator, field) => {
        const ownerKey = field?.owner_id || field?.owner_email || field?.id;

        if (!accumulator[ownerKey]) {
          accumulator[ownerKey] = {
            id: ownerKey,
            clientName: field?.owner_name || field?.owner_email || 'Unnamed client',
            clientEmail: field?.owner_email || '',
            totalArea: 0,
            attentionCount: 0,
            highRiskCount: 0,
            fields: []
          };
        }

        const latestAnalysis = latestAnalysisByFieldId[field.id];
        accumulator[ownerKey].totalArea += Number(field?.area_ha || 0);
        accumulator[ownerKey].fields.push({
          ...field,
          latestRisk: latestAnalysis?.risk_level || null,
          latestCrop: latestAnalysis?.crop_type || null,
          latestAnalysisAt: latestAnalysis?.analysis_date || null
        });

        if (latestAnalysis?.risk_level === 'High') {
          accumulator[ownerKey].highRiskCount += 1;
        }

        if (latestAnalysis?.risk_level === 'High' || latestAnalysis?.risk_level === 'Medium') {
          accumulator[ownerKey].attentionCount += 1;
        }

        return accumulator;
      }, {})
    ).sort((left, right) => {
      if (right.attentionCount !== left.attentionCount) {
        return right.attentionCount - left.attentionCount;
      }

      if (right.fields.length !== left.fields.length) {
        return right.fields.length - left.fields.length;
      }

      return left.clientName.localeCompare(right.clientName);
    });

    return {
      accessibleTotalArea,
      ownTotalArea,
      avgNdvi: average(ndviValues),
      latestHistoryItem,
      latestFieldAnalyses,
      latestAnalysisByFieldId,
      highRiskCount: highRiskFields.length,
      attentionCount: attentionFields.length,
      ownProblemFields,
      ownedFieldCount: ownedFields.length,
      sharedFieldCount: sharedFields.length,
      editableFieldCount: editableFields.length,
      averageArea,
      riskDistribution,
      topCrops,
      largestFields,
      analyzedFieldCount,
      clientGroups,
      analysisCoverage:
        fields.length > 0
          ? `${Math.round((analyzedFieldCount / fields.length) * 100)}%`
          : '—',
      recentHistory: history.slice(0, 5),
      recentAudit: auditLogs.slice(0, 6)
    };
  }, [auditLogs, fields, history]);

  const weeklyStats = adminStats?.weekly || {
    field_creations: [],
    analysis_runs: [],
    user_registrations: []
  };
  const roleBreakdown = adminStats?.role_breakdown || {};
  const primaryProblemFields = derivedData.ownProblemFields.length > 0
    ? derivedData.ownProblemFields
    : derivedData.highRiskCount > 0
      ? derivedData.latestFieldAnalyses.filter((item) => item?.risk_level === 'High')
      : derivedData.largestFields;

  const heroConfig = isAdmin
    ? {
        kicker: 'System Dashboard',
        title: `Welcome back, ${user?.full_name || user?.name || 'Admin'}`,
        subtitle: 'Review platform growth, keep user operations healthy, and monitor the analysis pipeline from one place.',
        primaryLabel: 'Open Admin Panel',
        primaryAction: () => onNavigate('Admin'),
        primaryStyle: undefined,
        secondaryLabel: 'Review projects',
        secondaryAction: () => onNavigate('Projects')
      }
    : isAgronomist
      ? {
          kicker: 'Consultant Dashboard',
          title: `Good to see you, ${user?.full_name || user?.name || 'Agronomist'}`,
          subtitle: 'Work through shared client fields, cluster issues by farmer, and jump straight into your next recommendation.',
          primaryLabel: 'Write Report',
          primaryAction: () => onNavigate('Workspace'),
          primaryStyle: undefined,
          secondaryLabel: 'Open clients',
          secondaryAction: () => onNavigate('Projects')
        }
      : {
          kicker: 'My Farm',
          title: `Welcome back, ${user?.full_name || user?.name || 'Farmer'}`,
          subtitle: 'Track your farm area, spot high-stress parcels early, and move quickly when a field needs follow-up.',
          primaryLabel: 'Add Field',
          primaryAction: () => onNavigate('Workspace'),
          primaryStyle: farmerHeroButtonStyle,
          secondaryLabel: 'Open My Farm',
          secondaryAction: () => onNavigate('Projects')
        };

  const summaryCards = isAdmin
    ? [
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
      ]
    : isAgronomist
      ? [
          {
            label: 'Client Groups',
            value: loading ? '...' : derivedData.clientGroups.length,
            helper: 'Distinct field owners whose parcels you can review',
            icon: <Users />,
            tone: 'var(--accent-color)'
          },
          {
            label: 'Accessible Fields',
            value: loading ? '...' : fields.length,
            helper: 'Shared fields available through owner access grants',
            icon: <Database />,
            tone: '#8b5cf6'
          },
          {
            label: 'Needs Attention',
            value: loading ? '...' : derivedData.attentionCount,
            helper: 'Fields with Medium or High latest risk',
            icon: <AlertTriangle />,
            tone: 'var(--status-warning)'
          },
          {
            label: 'Average NDVI',
            value: loading ? '...' : derivedData.avgNdvi,
            helper: 'Average index across your visible recent analyses',
            icon: <Activity />,
            tone: 'var(--status-healthy)'
          }
        ]
      : [
          {
            label: 'My Fields',
            value: loading ? '...' : derivedData.ownedFieldCount,
            helper: 'Fields you currently own and can manage directly',
            icon: <Database />,
            tone: 'var(--status-healthy)'
          },
          {
            label: 'Farm Area',
            value: loading ? '...' : formatArea(derivedData.ownTotalArea),
            helper: 'Combined area across your owned fields',
            icon: <MapIcon />,
            tone: 'var(--accent-color)'
          },
          {
            label: 'Problem Fields',
            value: loading ? '...' : derivedData.ownProblemFields.length,
            helper: 'Owned fields whose latest analysis is High risk',
            icon: <AlertTriangle />,
            tone: derivedData.ownProblemFields.length > 0 ? 'var(--status-critical)' : 'var(--status-warning)'
          },
          {
            label: 'Shared With You',
            value: loading ? '...' : derivedData.sharedFieldCount,
            helper: 'Additional parcels you can still review or edit',
            icon: <Share2 />,
            tone: '#8b5cf6'
          }
        ];

  const quickActions = isAdmin
    ? [
        {
          title: 'Open Admin Panel',
          text: 'Manage users, update roles, block accounts, and handle platform administration.',
          icon: <ShieldCheck size={18} color="var(--accent-color)" />,
          onClick: () => onNavigate('Admin')
        },
        {
          title: 'Manage users',
          text: 'Jump straight to account administration and update who can access the platform.',
          icon: <Users size={18} color="var(--status-healthy)" />,
          onClick: () => onNavigate('Admin')
        },
        {
          title: 'Review audit logs',
          text: 'Inspect recent account, field, and analysis events captured across the platform.',
          icon: <Clock3 size={18} color="#8b5cf6" />,
          onClick: () => onNavigate('Admin')
        }
      ]
    : isAgronomist
      ? [
          {
            title: 'Write Report',
            text: 'Open the workspace and leave expert conclusions for the next client follow-up.',
            icon: <FileText size={18} color="var(--accent-color)" />,
            onClick: () => onNavigate('Workspace')
          },
          {
            title: 'Open shared workspace',
            text: 'Inspect field boundaries, review the map, and continue the current advisory workflow.',
            icon: <MapIcon size={18} color="var(--status-healthy)" />,
            onClick: () => onNavigate('Workspace')
          },
          {
            title: 'Review collaborators',
            text: 'See who owns each field and confirm the right experts have access.',
            icon: <Users size={18} color="#8b5cf6" />,
            onClick: () => onNavigate('Team / Access')
          }
        ]
      : [
          {
            title: 'Add Field',
            text: 'Upload or draw a new parcel now and move it straight into analysis.',
            icon: <MapIcon size={18} color="#dcfce7" />,
            onClick: () => onNavigate('Workspace'),
            accent: true
          },
          {
            title: 'Share field access',
            text: 'Invite an agronomist by email and choose whether they can view or edit.',
            icon: <Share2 size={18} color="var(--accent-color)" />,
            onClick: () => onNavigate('Team / Access')
          },
          {
            title: 'Review latest report',
            text: 'Open the most recent analysis to check stress, NDVI, and recommended actions.',
            icon: <LineChart size={18} color="#8b5cf6" />,
            onClick: () => onNavigate('Analysis Report')
          }
        ];

  return (
    <div className="content-page">
      <section className="page-hero glass-panel">
        <div>
          <div className="page-kicker">{heroConfig.kicker}</div>
          <h1 className="page-title">{heroConfig.title}</h1>
          <p className="page-subtitle">{heroConfig.subtitle}</p>
        </div>

        <div className="page-hero-meta">
          <div className="page-hero-meta-card">
            <span className="page-hero-meta-label">Latest analysis</span>
            <strong>{formatDateTime(latestAnalysisAt || derivedData.latestHistoryItem?.analysis_date)}</strong>
          </div>
          <div className="page-hero-meta-card">
            <span className="page-hero-meta-label">Backend status</span>
            <strong>{backendHealthy ? 'Connected' : 'Unavailable'}</strong>
          </div>
          <div className="page-hero-actions">
            <button
              type="button"
              className="primary-btn"
              onClick={heroConfig.primaryAction}
              style={heroConfig.primaryStyle}
            >
              {heroConfig.primaryLabel}
            </button>
            <button type="button" className="secondary-btn" onClick={heroConfig.secondaryAction}>
              {heroConfig.secondaryLabel}
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="glass-panel" style={errorStyle}>
          {error}
        </div>
      )}

      <section className="metric-grid">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </section>

      {isAdmin ? (
        <>
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
                  {derivedData.recentAudit.slice(0, 6).map((log) => (
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
        </>
      ) : (
        <section className="dashboard-analytics-grid">
          <AnalyticsCard
            kicker={isAgronomist ? 'Client Scope' : 'Farm Mix'}
            title={isAgronomist ? 'Fields grouped by client' : 'How your farm access is split'}
            helper={isAgronomist ? 'Use owner data to organize work by farmer.' : 'Owned, shared, and editable parcels based on your current access.'}
            icon={<Users size={18} color="var(--accent-color)" />}
          >
            {isAgronomist ? (
              derivedData.clientGroups.length === 0 ? (
                <div className="empty-state compact">No shared client fields are available yet.</div>
              ) : (
                <div className="stack-list compact">
                  {derivedData.clientGroups.slice(0, 4).map((group) => (
                    <div key={group.id} className="stack-row">
                      <span>{group.clientName}</span>
                      <strong>{group.fields.length} fields</strong>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="analytics-stat-grid">
                <div className="analytics-stat-block">
                  <span className="analytics-stat-label">Owned</span>
                  <strong>{loading ? '...' : derivedData.ownedFieldCount}</strong>
                </div>
                <div className="analytics-stat-block">
                  <span className="analytics-stat-label">Shared</span>
                  <strong>{loading ? '...' : derivedData.sharedFieldCount}</strong>
                </div>
                <div className="analytics-stat-block">
                  <span className="analytics-stat-label">Editable</span>
                  <strong>{loading ? '...' : derivedData.editableFieldCount}</strong>
                </div>
              </div>
            )}
          </AnalyticsCard>

          <AnalyticsCard
            kicker="Risk Mix"
            title="Latest visible field risk distribution"
            helper="Counts are based on the newest visible analysis for each field."
            icon={<AlertTriangle size={18} color="var(--status-warning)" />}
          >
            {derivedData.latestFieldAnalyses.length === 0 ? (
              <div className="empty-state compact">No completed analyses yet.</div>
            ) : (
              <div className="distribution-list">
                {derivedData.riskDistribution.map((item) => {
                  const total = derivedData.latestFieldAnalyses.length || 1;
                  const width = item.count > 0 ? Math.max((item.count / total) * 100, 8) : 0;

                  return (
                    <div key={item.level} className="distribution-row">
                      <div className="distribution-label">
                        <span>{item.level}</span>
                        <span className={`status-pill ${getRiskTone(item.level)}`}>{item.count}</span>
                      </div>
                      <div className="distribution-track">
                        <div
                          className={`distribution-fill ${getRiskTone(item.level)}`}
                          style={{ width: `${width}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </AnalyticsCard>

          <AnalyticsCard
            kicker={isAgronomist ? 'Consulting Snapshot' : 'Farm Snapshot'}
            title={isAgronomist ? 'What needs attention first' : 'Current farm operating picture'}
            helper={isAgronomist ? 'Prioritize client work from the riskiest visible parcels.' : 'Track coverage, total area, and recent vegetation health.'}
            icon={<Activity size={18} color="var(--status-healthy)" />}
          >
            <div className="stack-list compact">
              <div className="stack-row">
                <span>{isAgronomist ? 'Client groups' : 'Owned area'}</span>
                <strong>{loading ? '...' : isAgronomist ? derivedData.clientGroups.length : formatArea(derivedData.ownTotalArea)}</strong>
              </div>
              <div className="stack-row">
                <span>{isAgronomist ? 'Accessible area' : 'Analysis coverage'}</span>
                <strong>{loading ? '...' : isAgronomist ? formatArea(derivedData.accessibleTotalArea) : derivedData.analysisCoverage}</strong>
              </div>
              <div className="stack-row">
                <span>Recent analyses</span>
                <strong>{loading ? '...' : derivedData.analyzedFieldCount}</strong>
              </div>
              <div className="stack-row">
                <span>Average NDVI</span>
                <strong>{loading ? '...' : derivedData.avgNdvi}</strong>
              </div>
            </div>
          </AnalyticsCard>
        </section>
      )}

      <section className="split-panel-grid">
        <div className="section-card glass-panel">
          <div className="section-card-header">
            <div>
              <div className="section-kicker">Quick Actions</div>
              <h2>{isAdmin ? 'Operations shortcuts' : isAgronomist ? 'Consulting workflow' : 'Farm workflow'}</h2>
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
              <div className="section-kicker">{isAdmin ? 'Platform Snapshot' : 'Operational Snapshot'}</div>
              <h2>{isAdmin ? 'What the system says right now' : 'What the dashboard says right now'}</h2>
            </div>
          </div>

          <div className="stack-list">
            <div className="stack-row">
              <span>{isAdmin ? 'Platform project area' : isAgronomist ? 'Accessible project area' : 'My farm area'}</span>
              <strong>{loading ? '...' : formatArea(isFarmer ? derivedData.ownTotalArea : derivedData.accessibleTotalArea)}</strong>
            </div>
            <div className="stack-row">
              <span>Projects with recent analyses</span>
              <strong>{loading ? '...' : derivedData.analyzedFieldCount}</strong>
            </div>
            <div className="stack-row">
              <span>Average field area</span>
              <strong>{loading ? '...' : formatArea(derivedData.averageArea)}</strong>
            </div>
            <div className="stack-row">
              <span>Average NDVI</span>
              <strong>{loading ? '...' : derivedData.avgNdvi}</strong>
            </div>
            {isAdmin ? (
              <>
                <div className="stack-row">
                  <span>Recent audit entries</span>
                  <strong>{loading ? '...' : derivedData.recentAudit.length}</strong>
                </div>
                <div className="stack-row">
                  <span>Admins on platform</span>
                  <strong>{loading ? '...' : roleBreakdown.ADMIN ?? 0}</strong>
                </div>
              </>
            ) : (
              <div className="stack-row">
                <span>{isAgronomist ? 'Client groups' : 'High-risk farm fields'}</span>
                <strong>{loading ? '...' : isAgronomist ? derivedData.clientGroups.length : derivedData.ownProblemFields.length}</strong>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="split-panel-grid">
        <div className="section-card glass-panel">
          <div className="section-card-header">
            <div>
              <div className="section-kicker">
                {isAdmin ? 'Attention Queue' : isAgronomist ? 'Client Groups' : 'Problem Fields'}
              </div>
              <h2>
                {isAdmin
                  ? 'Projects that need attention'
                  : isAgronomist
                    ? 'Fields grouped by farmer'
                    : 'Fields that need follow-up'}
              </h2>
            </div>
          </div>

          {isAgronomist ? (
            derivedData.clientGroups.length === 0 ? (
              <div className="empty-state">No client fields have been shared with you yet.</div>
            ) : (
              <div style={clientGroupStackStyle}>
                {derivedData.clientGroups.slice(0, 3).map((group) => (
                  <ClientGroupCard key={group.id} group={group} onNavigate={onNavigate} />
                ))}
              </div>
            )
          ) : primaryProblemFields.length === 0 ? (
            <div className="empty-state">
              {isAdmin
                ? 'No platform project data is available yet.'
                : 'No high-risk fields yet. Run analyses to surface farm issues here.'}
            </div>
          ) : (
            <div className="stack-list">
              {primaryProblemFields.slice(0, 6).map((item) => {
                const fieldName = item.field_name || item.name || 'Unnamed field';
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
              <div className="section-kicker">{isAdmin ? 'Platform Activity' : 'Recent Activity'}</div>
              <h2>{isAdmin ? 'Latest platform activity' : 'Latest completed analyses'}</h2>
            </div>
          </div>

          {isAdmin && derivedData.recentAudit.length > 0 ? (
            <div className="stack-list">
              {derivedData.recentAudit.map((log) => (
                <div key={log.id} className="list-row">
                  <div>
                    <strong>{log.action || 'Unknown action'}</strong>
                    <p>
                      {(log.entity_type || 'entity').toUpperCase()} · User {String(log.user_id || '—').slice(0, 8)} · {formatDateTime(log.created_at)}
                    </p>
                  </div>
                  <Clock3 size={16} color="var(--text-secondary)" />
                </div>
              ))}
            </div>
          ) : derivedData.recentHistory.length === 0 ? (
            <div className="empty-state">No completed analyses yet. Run or review an analysis to populate this activity feed.</div>
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

      {!isAdmin && derivedData.topCrops.length > 0 && (
        <section className="section-card glass-panel">
          <div className="section-card-header">
            <div>
              <div className="section-kicker">Crop Mix</div>
              <h2>Most frequent current crop predictions</h2>
            </div>
          </div>

          <div className="stack-list compact">
            {derivedData.topCrops.map((crop) => (
              <div key={crop.label} className="stack-row">
                <span>{crop.label}</span>
                <strong>{crop.count}</strong>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const errorStyle = {
  padding: '14px 16px',
  borderRadius: '14px',
  color: '#fecaca',
  border: '1px solid rgba(239, 68, 68, 0.3)',
  background: 'rgba(239, 68, 68, 0.08)'
};

const farmerHeroButtonStyle = {
  background: 'linear-gradient(135deg, #16a34a, #22c55e)',
  boxShadow: '0 14px 28px rgba(34, 197, 94, 0.24)',
  border: '1px solid rgba(134, 239, 172, 0.25)'
};

const accentActionStyle = {
  background: 'linear-gradient(135deg, rgba(22, 163, 74, 0.18), rgba(34, 197, 94, 0.14))',
  border: '1px solid rgba(74, 222, 128, 0.3)'
};

const accentActionIconStyle = {
  background: 'rgba(22, 163, 74, 0.18)',
  color: '#dcfce7'
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
  background: 'rgba(15, 23, 42, 0.38)',
  border: '1px solid rgba(148, 163, 184, 0.12)',
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
  border: '1px solid rgba(148, 163, 184, 0.14)',
  background: 'rgba(15, 23, 42, 0.28)',
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

const clientGroupStackStyle = {
  display: 'grid',
  gap: '14px'
};

const clientCardStyle = {
  borderRadius: '20px',
  border: '1px solid rgba(148, 163, 184, 0.14)',
  background: 'rgba(15, 23, 42, 0.24)',
  padding: '16px',
  display: 'grid',
  gap: '14px'
};

const clientCardHeaderStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '14px'
};

const clientMetaStyle = {
  color: 'var(--text-secondary)',
  fontSize: '0.76rem',
  marginTop: '4px'
};

const clientStatGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '10px'
};

const clientStatStyle = {
  padding: '10px 12px',
  borderRadius: '14px',
  background: 'rgba(2, 6, 23, 0.3)',
  border: '1px solid rgba(148, 163, 184, 0.1)',
  display: 'grid',
  gap: '6px'
};

const clientStatLabelStyle = {
  color: 'var(--text-secondary)',
  fontSize: '0.7rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em'
};

const miniListStyle = {
  display: 'grid',
  gap: '10px'
};

const miniListRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  gap: '12px'
};

const miniListMetaStyle = {
  margin: '4px 0 0',
  color: 'var(--text-secondary)',
  fontSize: '0.78rem'
};
