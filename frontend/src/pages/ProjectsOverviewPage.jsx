import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { fetchAllFields, fetchAnalysisHistory } from '../api/client';
import { formatAreaMeasure } from '../utils/analysisFormatters';
import {
  buildFieldWorkspaceSummaries,
  formatWorkspaceDateTime,
  getRiskTone,
  sortAnalysesByNewest
} from '../utils/fieldAnalysisUtils';

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

  const isAgronomist = user?.role === 'AGRONOMIST';
  const canCreateField = user?.role !== 'AGRONOMIST';

  useEffect(() => {
    let isActive = true;

    const loadFarmData = async () => {
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

    void loadFarmData();

    return () => {
      isActive = false;
    };
  }, [backendHealthy, refreshKey]);

  const fieldSummaries = useMemo(
    () => buildFieldWorkspaceSummaries(fields, history),
    [fields, history]
  );

  const sortedFieldSummaries = useMemo(
    () => [...fieldSummaries].sort((left, right) => {
      const rightTime = new Date(right.latestAnalysisAt || 0).getTime();
      const leftTime = new Date(left.latestAnalysisAt || 0).getTime();

      if (rightTime !== leftTime) {
        return rightTime - leftTime;
      }

      return left.field.name.localeCompare(right.field.name);
    }),
    [fieldSummaries]
  );

  const handleViewReport = (item) => {
    const preferredAnalysis = item.latestOverallAnalysis;

    if (preferredAnalysis) {
      onOpenAnalysis(preferredAnalysis, item.field);
      return;
    }

    onOpenField(item.field, null, { navigate: false });
    onNavigate('Analysis Report');
  };

  return (
    <div className="content-page">
      <section className="page-hero glass-panel">
        <div>
          <div className="page-kicker">Farm overview</div>
          <h1 className="page-title">My Farm</h1>
          <p className="page-subtitle">
            A simple list of your accessible fields with quick actions to open the workspace or view the latest report.
          </p>
        </div>

        {canCreateField ? (
          <button
            type="button"
            className="primary-btn"
            onClick={() => {
              if (typeof onCreateProject === 'function') {
                onCreateProject();
                return;
              }

              onNavigate('Workspace');
            }}
          >
            <Plus size={16} />
            Add Field
          </button>
        ) : null}
      </section>

      {notice ? (
        <div className="workspace-notice-banner">{notice}</div>
      ) : null}

      <section className="glass-panel" style={listPanelStyle}>
        {loading ? (
          <div className="empty-state">Loading fields...</div>
        ) : sortedFieldSummaries.length === 0 ? (
          <div className="empty-state">
            No fields saved yet. Open Workspace to upload or draw a field boundary.
          </div>
        ) : (
          <div style={fieldListStyle}>
            {sortedFieldSummaries.map((item) => {
              const latest = item.latestOverallAnalysis;

              return (
                <article key={item.field.id} style={fieldRowStyle}>
                  <div style={fieldInfoStyle}>
                    <strong style={{ fontSize: '1rem' }}>{item.field.name}</strong>
                    <div className="workspace-helper-text">
                      {formatAreaMeasure(item.field.area_ha)} · {item.field.role || 'Accessible field'}
                    </div>

                    {(isAgronomist || user?.role === 'ADMIN') && (item.field.owner_name || item.field.owner_email) ? (
                      <div className="workspace-helper-text">
                        Owner: {item.field.owner_name || item.field.owner_email}
                      </div>
                    ) : null}
                  </div>

                  <div style={fieldMetaStyle}>
                    <span className={`status-pill ${getRiskTone(item.latestRisk)}`}>
                      {item.latestRisk || 'Not analyzed'}
                    </span>
                    <span className="workspace-helper-text">
                      {formatWorkspaceDateTime(latest?.analysis_date, 'No analysis yet')}
                    </span>
                  </div>

                  <div style={fieldActionsStyle}>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={() => onOpenField(item.field, latest)}
                    >
                      Open Field
                    </button>
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() => handleViewReport(item)}
                    >
                      View Report
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

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
  gridTemplateColumns: 'minmax(0, 1fr) auto auto',
  gap: '16px',
  alignItems: 'center',
  padding: '16px',
  borderRadius: '16px',
  border: '1px solid var(--border-color)',
  background: 'rgba(255,255,255,0.02)'
};

const fieldInfoStyle = {
  minWidth: 0
};

const fieldMetaStyle = {
  display: 'grid',
  gap: '6px',
  justifyItems: 'end',
  textAlign: 'right'
};

const fieldActionsStyle = {
  display: 'flex',
  gap: '10px',
  justifyContent: 'flex-end',
  flexWrap: 'wrap'
};
