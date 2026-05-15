import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ChevronRight,
  Clock3,
  Database,
  LineChart,
  Map,
  ShieldCheck
} from 'lucide-react';
import { fetchAllFields, fetchAnalysisHistory } from '../api';

const formatDateTime = (value) => {
  if (!value) {
    return 'No completed runs yet';
  }

  return new Date(value).toLocaleString();
};

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

export default function HomePage({
  user,
  backendHealthy,
  onNavigate,
  refreshKey,
  analysisResults,
  latestAnalysisAt
}) {
  const [fields, setFields] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadDashboardData = async () => {
      setLoading(true);

      const [fieldsResult, historyResult] = await Promise.allSettled([
        fetchAllFields(),
        fetchAnalysisHistory()
      ]);

      if (!isActive) {
        return;
      }

      if (fieldsResult.status === 'fulfilled') {
        setFields(fieldsResult.value.data || []);
      }

      if (historyResult.status === 'fulfilled') {
        const sortedHistory = [...(historyResult.value.data || [])].sort(
          (left, right) => new Date(right.analysis_date) - new Date(left.analysis_date)
        );
        setHistory(sortedHistory);
      }

      setLoading(false);
    };

    loadDashboardData();

    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  const highRiskCount = history.filter((item) => item.risk_level === 'High').length;
  const avgNdviValues = history
    .map((item) => item.ndvi_value)
    .filter((value) => value !== null && value !== undefined);
  const avgNdvi = avgNdviValues.length
    ? (avgNdviValues.reduce((sum, value) => sum + value, 0) / avgNdviValues.length).toFixed(3)
    : '—';
  const latestHistoryItem = history[0];
  const latestCrop = analysisResults.cropType !== '—'
    ? analysisResults.cropType
    : latestHistoryItem?.crop_type || 'No prediction yet';
  const recentFields = [...fields].slice(-3).reverse();
  const recentHistory = history.slice(0, 4);

  const summaryCards = [
    {
      label: 'Saved Fields',
      value: loading ? '...' : fields.length,
      helper: 'Parcels stored in PostgreSQL',
      icon: <Database />,
      tone: 'var(--accent-color)'
    },
    {
      label: 'Completed Analyses',
      value: loading ? '...' : history.length,
      helper: 'Historical NDVI, EVI, and model runs',
      icon: <BarChart3 />,
      tone: '#8b5cf6'
    },
    {
      label: 'Average NDVI',
      value: loading ? '...' : avgNdvi,
      helper: 'Average across saved analysis history',
      icon: <Activity />,
      tone: 'var(--status-healthy)'
    },
    {
      label: 'High Risk Fields',
      value: loading ? '...' : highRiskCount,
      helper: backendHealthy ? 'Backend connected and ready' : 'Backend health needs attention',
      icon: <AlertTriangle />,
      tone: highRiskCount > 0 ? 'var(--status-critical)' : 'var(--status-warning)'
    }
  ];

  return (
    <div className="content-page">
      <section className="page-hero glass-panel">
        <div>
          <div className="page-kicker">AgroVision Workspace</div>
          <h1 className="page-title">Welcome back, {user?.name || 'Research Analyst'}</h1>
          <p className="page-subtitle">
            Start from Home, then move into the map workspace only when you are ready to define a field, fetch satellite data, or launch a new transfer-learning analysis run.
          </p>
        </div>

        <div className="page-hero-meta">
          <div className="page-hero-meta-card">
            <span className="page-hero-meta-label">Latest analysis</span>
            <strong>{formatDateTime(latestAnalysisAt || latestHistoryItem?.analysis_date)}</strong>
          </div>
          <div className="page-hero-meta-card">
            <span className="page-hero-meta-label">Current AI prediction</span>
            <strong>{latestCrop}</strong>
          </div>
          <div className="page-hero-actions">
            <button type="button" className="primary-btn" onClick={() => onNavigate('Workspace')}>
              Open Workspace
            </button>
            <button type="button" className="secondary-btn" onClick={() => onNavigate('Analysis Report')}>
              Latest Report
            </button>
          </div>
        </div>
      </section>

      <section className="metric-grid">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </section>

      <section className="split-panel-grid">
        <div className="section-card glass-panel">
          <div className="section-card-header">
            <div>
              <div className="section-kicker">Quick Actions</div>
              <h2>Move through the product flow</h2>
            </div>
          </div>

          <div className="action-grid">
            <QuickAction
              title="Start a new field analysis"
              text="Open the workspace map, upload or draw a field, and run the current Sentinel-2 pipeline."
              icon={<Map size={18} color="var(--accent-color)" />}
              onClick={() => onNavigate('Workspace')}
            />
            <QuickAction
              title="Review the latest AI report"
              text="Inspect NDVI, EVI, crop prediction, stress zones, and recommendations from the most recent run."
              icon={<LineChart size={18} color="var(--status-healthy)" />}
              onClick={() => onNavigate('Analysis Report')}
            />
            <QuickAction
              title="Browse saved projects"
              text="See stored fields, historical analysis records, and risk trends across your portfolio."
              icon={<Database size={18} color="#8b5cf6" />}
              onClick={() => onNavigate('Projects')}
            />
          </div>
        </div>

        <div className="section-card glass-panel">
          <div className="section-card-header">
            <div>
              <div className="section-kicker">System Snapshot</div>
              <h2>Current operating context</h2>
            </div>
          </div>

          <div className="stack-list">
            <div className="stack-row">
              <span>Backend status</span>
              <strong className={backendHealthy ? 'tone-healthy' : 'tone-critical'}>
                {backendHealthy ? 'Connected' : 'Unavailable'}
              </strong>
            </div>
            <div className="stack-row">
              <span>Latest risk classification</span>
              <strong>{analysisResults.riskLevel !== '—' ? analysisResults.riskLevel : latestHistoryItem?.risk_level || 'No result yet'}</strong>
            </div>
            <div className="stack-row">
              <span>Vegetation health</span>
              <strong>{analysisResults.vegetationHealth !== '—' ? analysisResults.vegetationHealth : 'Pending analysis'}</strong>
            </div>
            <div className="stack-row">
              <span>AI confidence</span>
              <strong>{analysisResults.confidence !== '—' ? analysisResults.confidence : 'Pending analysis'}</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="split-panel-grid">
        <div className="section-card glass-panel">
          <div className="section-card-header">
            <div>
              <div className="section-kicker">Recent Projects</div>
              <h2>Saved field boundaries</h2>
            </div>
          </div>

          {recentFields.length === 0 ? (
            <div className="empty-state">No fields saved yet. Head to Workspace to upload or draw your first parcel.</div>
          ) : (
            <div className="stack-list">
              {recentFields.map((field) => (
                <div key={field.id} className="list-row">
                  <div>
                    <strong>{field.name}</strong>
                    <p>{field.area_ha ? `${field.area_ha.toFixed(2)} ha` : 'Area pending'}</p>
                  </div>
                  <button type="button" className="text-btn" onClick={() => onNavigate('Projects')}>
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="section-card glass-panel">
          <div className="section-card-header">
            <div>
              <div className="section-kicker">Recent Activity</div>
              <h2>Latest completed analyses</h2>
            </div>
          </div>

          {recentHistory.length === 0 ? (
            <div className="empty-state">No completed analyses yet. Run your first analysis from the workspace to populate this feed.</div>
          ) : (
            <div className="stack-list">
              {recentHistory.map((item) => (
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

      <section className="section-card glass-panel">
        <div className="section-card-header">
          <div>
            <div className="section-kicker">Strategic Insight</div>
            <h2>How to use the platform well</h2>
          </div>
        </div>

        <div className="insight-grid">
          <div className="insight-card">
            <ShieldCheck size={18} color="var(--status-healthy)" />
            <div>
              <strong>Use Home as the control tower</strong>
              <p>Keep the first screen focused on decisions, status, and next actions instead of dropping users straight into tools.</p>
            </div>
          </div>
          <div className="insight-card">
            <Map size={18} color="var(--accent-color)" />
            <div>
              <strong>Use Workspace for execution</strong>
              <p>The map remains the operational surface for field selection, geodata preparation, and triggering the analysis pipeline.</p>
            </div>
          </div>
          <div className="insight-card">
            <LineChart size={18} color="#8b5cf6" />
            <div>
              <strong>Use Analysis Report for interpretation</strong>
              <p>Report pages should answer what happened, how confident the model is, and what an agronomist should inspect next.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
