import React, { useEffect, useState } from 'react';
import { AlertTriangle, Database, ShieldCheck, Users } from 'lucide-react';
import { fetchAllFields, fetchAnalysisHistory } from '../api';

const Metric = ({ label, value, helper, icon, tone }) => (
  <div className="metric-card glass-panel">
    <div className="metric-card-top">
      <span className="metric-label">{label}</span>
      {React.cloneElement(icon, { size: 18, color: tone })}
    </div>
    <div className="metric-value">{value}</div>
    <div className="metric-helper">{helper}</div>
  </div>
);

export default function AdminDashboardPage({ refreshKey, onNavigate, backendHealthy }) {
  const [fields, setFields] = useState([]);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    let isActive = true;

    const loadAdminData = async () => {
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
    };

    loadAdminData();

    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  const highRiskCount = history.filter((item) => item.risk_level === 'High').length;

  return (
    <div className="content-page">
      <section className="page-hero glass-panel">
        <div>
          <div className="page-kicker">Optional Admin Surface</div>
          <h1 className="page-title">AgroVision Admin Dashboard</h1>
          <p className="page-subtitle">
            This page stays outside the main private navigation, but the app is now structured to support role-based control surfaces when you need them.
          </p>
        </div>

        <div className="page-hero-actions">
          <button type="button" className="secondary-btn" onClick={() => onNavigate('Profile')}>
            Back to Profile
          </button>
        </div>
      </section>

      <section className="metric-grid">
        <Metric
          label="Backend"
          value={backendHealthy ? 'Online' : 'Offline'}
          helper="Health check from the FastAPI service"
          icon={<ShieldCheck />}
          tone={backendHealthy ? 'var(--status-healthy)' : 'var(--status-critical)'}
        />
        <Metric
          label="Saved Fields"
          value={fields.length}
          helper="Parcels currently stored in the system"
          icon={<Database />}
          tone="var(--accent-color)"
        />
        <Metric
          label="Completed Analyses"
          value={history.length}
          helper="Historical analysis records available"
          icon={<Users />}
          tone="#8b5cf6"
        />
        <Metric
          label="High Risk Events"
          value={highRiskCount}
          helper="Runs flagged as high agricultural risk"
          icon={<AlertTriangle />}
          tone="var(--status-critical)"
        />
      </section>

      <section className="split-panel-grid">
        <div className="section-card glass-panel">
          <div className="section-card-header">
            <div>
              <div className="section-kicker">Operational Readiness</div>
              <h2>Why this admin layer exists</h2>
            </div>
          </div>

          <div className="stack-list">
            <div className="stack-row">
              <span>Private navigation simplicity</span>
              <strong>Main users see only the five primary pages</strong>
            </div>
            <div className="stack-row">
              <span>Role-based expansion</span>
              <strong>Admin features can grow without disrupting analysts</strong>
            </div>
            <div className="stack-row">
              <span>Backend safety</span>
              <strong>No API contracts were changed in this frontend refactor</strong>
            </div>
          </div>
        </div>

        <div className="section-card glass-panel">
          <div className="section-card-header">
            <div>
              <div className="section-kicker">Recent Risk Signals</div>
              <h2>Latest flagged analyses</h2>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="empty-state">No analysis history is available yet.</div>
          ) : (
            <div className="stack-list">
              {history.slice(0, 5).map((item) => (
                <div key={item.analysis_id} className="list-row">
                  <div>
                    <strong>{item.field_name || 'Unnamed field'}</strong>
                    <p>{item.risk_level || 'Unknown risk'} · {new Date(item.analysis_date).toLocaleString()}</p>
                  </div>
                  <span className={`status-pill ${item.risk_level === 'High' ? 'critical' : item.risk_level === 'Medium' ? 'warning' : 'healthy'}`}>
                    {item.risk_level || 'Unknown'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
