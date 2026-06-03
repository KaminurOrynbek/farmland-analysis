import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  FileText,
  MapPinned,
  MessageSquare,
  ShieldAlert
} from 'lucide-react';
import FieldCommentsPanel from './FieldCommentsPanel';
import { formatAreaMeasure } from '../../utils/analysisFormatters';
import { formatWorkspaceDateTime, getRiskTone } from '../../utils/fieldAnalysisUtils';

function DetailRow({ icon, label, value }) {
  return (
    <div className="workspace-selection-row">
      <div className="workspace-selection-label">
        {icon}
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
    </div>
  );
}

function HistoryRow({ analysis }) {
  const cropType = analysis?.crop_type || 'Detected cover unavailable';
  const riskLabel = analysis?.risk_level || 'Not analyzed';

  return (
    <article className="workspace-history-row">
      <div>
        <strong style={{ display: 'block', marginBottom: '4px' }}>
          {formatWorkspaceDateTime(analysis?.analysis_date, 'Analysis date pending')}
        </strong>
        <p className="workspace-helper-text" style={{ margin: 0 }}>
          {cropType}
        </p>
      </div>

      <span className={`status-pill ${getRiskTone(riskLabel)}`}>
        {riskLabel}
      </span>
    </article>
  );
}

export default function WorkspaceSelectionCard({
  user,
  fieldId,
  selectedField,
  hasGeometry,
  fieldRecord,
  riskLevel,
  latestAnalysisAt,
  analysisHistory = [],
  canViewResults,
  onOpenResults
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const fieldName = fieldRecord?.name || 'No field selected';
  const fieldArea = fieldRecord?.area_ha
    ? formatAreaMeasure(fieldRecord.area_ha)
    : 'Area pending';
  const statusLabel = riskLevel || 'Not analyzed';
  const hasHistory = analysisHistory.length > 0;
  const currentTab = activeTab === 'history' && !hasHistory ? 'overview' : activeTab;
  const overviewDetails = [
    { id: 'area', icon: <MapPinned size={14} />, label: 'Area', value: fieldArea },
    { id: 'status', icon: <ShieldAlert size={14} />, label: 'Latest status', value: statusLabel },
    {
      id: 'analysis',
      icon: <CalendarClock size={14} />,
      label: 'Latest analysis',
      value: formatWorkspaceDateTime(latestAnalysisAt, 'No analysis yet')
    }
  ];

  const availableTabs = useMemo(() => {
    const tabs = [
      { id: 'overview', label: 'Overview', icon: <MapPinned size={14} /> },
      { id: 'comments', label: 'Comments', icon: <MessageSquare size={14} />, guideId: 'field-comments' }
    ];

    if (hasHistory) {
      tabs.push({ id: 'history', label: 'History', icon: <CalendarClock size={14} /> });
    }

    return tabs;
  }, [hasHistory]);

  useEffect(() => {
    const handleGuideRequest = (event) => {
      if (event.detail?.targetTab === 'comments') {
        setIsCollapsed(false);
        setActiveTab('comments');
      }

      if (event.detail?.targetTab === 'overview') {
        setIsCollapsed(false);
        setActiveTab('overview');
      }
    };

    window.addEventListener('workspace-guide-target', handleGuideRequest);

    return () => {
      window.removeEventListener('workspace-guide-target', handleGuideRequest);
    };
  }, []);

  return (
    <aside
      className={`workspace-side-panel workspace-compact-panel workspace-summary-card workspace-selection-overlay glass-panel ${
        isCollapsed ? 'collapsed' : ''
      }`}
    >
      <section className="workspace-panel-section">
        <div className="workspace-section-heading workspace-selection-heading">
          <div className="workspace-section-icon">
            <MapPinned size={16} />
          </div>

          <div style={{ minWidth: 0, flex: 1 }}>
            <strong style={{ fontSize: '0.96rem' }}>Selected field</strong>
            {!isCollapsed ? (
              <p className="workspace-helper-text" style={{ margin: '4px 0 0' }}>
                {fieldId
                  ? 'Saved field details and team context.'
                  : 'Select or save a field to open details.'}
              </p>
            ) : null}
          </div>

          <button
            type="button"
            className="workspace-icon-btn"
            onClick={() => setIsCollapsed((current) => !current)}
            aria-label={isCollapsed ? 'Expand selected field panel' : 'Collapse selected field panel'}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>

        <div className="workspace-note-card">
          <div className="workspace-inline-title">
            <strong>{fieldName}</strong>
            <span className={`status-pill ${getRiskTone(riskLevel)}`}>
              <ShieldAlert size={14} />
              {statusLabel}
            </span>
          </div>
        </div>

        {!isCollapsed ? (
          <>
            <div className="workspace-selection-tabs">
              {availableTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`workspace-selection-tab${currentTab === tab.id ? ' active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  data-guide={tab.guideId || undefined}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="workspace-selection-panel-content">
              {currentTab === 'overview' ? (
                <div className="workspace-selection-list">
                  {overviewDetails.map((item) => (
                    <DetailRow
                      key={item.id}
                      icon={item.icon}
                      label={item.label}
                      value={item.value}
                    />
                  ))}
                </div>
              ) : null}

              {currentTab === 'comments' ? (
                <FieldCommentsPanel
                  user={user}
                  fieldId={fieldId}
                  selectedField={selectedField}
                  hasGeometry={hasGeometry}
                  variant="embedded"
                />
              ) : null}

              {currentTab === 'history' && hasHistory ? (
                <div className="workspace-selection-history-list">
                  {analysisHistory.slice(0, 5).map((analysis) => (
                    <HistoryRow
                      key={analysis.id || `${analysis.analysis_date}-${analysis.crop_type}`}
                      analysis={analysis}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="workspace-inline-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => onOpenResults?.()}
                disabled={!canViewResults}
                title={canViewResults ? undefined : 'Run an analysis first to open the results.'}
                data-guide="open-report"
              >
                <FileText size={16} />
                Open results
              </button>
            </div>
          </>
        ) : null}
      </section>
    </aside>
  );
}
