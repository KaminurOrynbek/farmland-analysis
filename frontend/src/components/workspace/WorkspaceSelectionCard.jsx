import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarClock, FileText, MapPinned, MessageSquare } from 'lucide-react';
import { formatAreaMeasure } from '../../utils/analysisFormatters';
import {
  formatWorkspaceDateTime,
  getFieldSelectionName,
  getRiskTone
} from '../../utils/fieldAnalysisUtils';
import FieldCommentsPanel from './FieldCommentsPanel';

const isUsableAnalysis = (analysis) => (
  analysis?.status === 'DONE' ||
  Boolean(analysis?.predictedClass || analysis?.riskLevel) ||
  analysis?.ndviValue !== null && analysis?.ndviValue !== undefined ||
  analysis?.eviValue !== null && analysis?.eviValue !== undefined
);

function SelectionTab({ id, label, isActive, onClick }) {
  return (
    <button
      type="button"
      className={`workspace-selection-tab ${isActive ? 'active' : ''}`}
      onClick={() => onClick(id)}
    >
      {label}
    </button>
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
  onViewResults,
  onOpenAnalysis
}) {
  const [activeTab, setActiveTab] = useState('overview');
  const cardRef = useRef(null);

  const selectedFieldName = fieldRecord?.name || getFieldSelectionName(selectedField);
  const selectedFieldArea = fieldRecord?.area_ha || selectedField?.properties?.area || selectedField?.properties?.area_ha;
  const usableHistory = useMemo(
    () => analysisHistory.filter((item) => isUsableAnalysis(item)),
    [analysisHistory]
  );
  const displayedRiskLevel = riskLevel || usableHistory[0]?.riskLevel || null;
  const latestResultAt = latestAnalysisAt || usableHistory[0]?.analysisDate || null;
  const hasSavedField = Boolean(fieldId);

  useEffect(() => {
    const handleGuideTarget = (event) => {
      const targetTab = event.detail?.targetTab;

      if (!targetTab) {
        return;
      }

      if (targetTab === 'overview' || targetTab === 'comments' || targetTab === 'history') {
        setActiveTab(targetTab);
        window.setTimeout(() => {
          cardRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest'
          });
        }, 0);
      }
    };

    window.addEventListener('workspace-guide-target', handleGuideTarget);
    return () => window.removeEventListener('workspace-guide-target', handleGuideTarget);
  }, []);

  const renderOverview = () => (
    <div className="workspace-selection-list">
      <div className="workspace-selection-row">
        <span className="workspace-selection-label">
          <MapPinned size={14} />
          Field
        </span>
        <strong>{selectedFieldName}</strong>
      </div>

      <div className="workspace-selection-row">
        <span className="workspace-selection-label">
          <FileText size={14} />
          Area
        </span>
        <strong>{selectedFieldArea ? formatAreaMeasure(selectedFieldArea) : 'Area pending'}</strong>
      </div>

      <div className="workspace-selection-row">
        <span className="workspace-selection-label">
          <CalendarClock size={14} />
          Last analysis
        </span>
        <strong>{formatWorkspaceDateTime(latestResultAt, 'No analysis yet')}</strong>
      </div>

      <div className="workspace-selection-row">
        <span className="workspace-selection-label">
          <MessageSquare size={14} />
          Saved runs
        </span>
        <strong>{analysisHistory.length}</strong>
      </div>

      {canViewResults || hasSavedField ? (
        <div className="workspace-inline-actions">
          {canViewResults ? (
            <button
              type="button"
              className="primary-btn"
              onClick={() => onViewResults?.()}
              data-guide="open-report"
            >
              View results
            </button>
          ) : null}

          {hasSavedField ? (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => setActiveTab('comments')}
            >
              Open comments
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const renderComments = () => (
    <FieldCommentsPanel
      user={user}
      fieldId={fieldId}
      selectedField={fieldRecord || selectedField}
      hasGeometry={hasGeometry}
      variant="embedded"
    />
  );

  const renderHistory = () => {
    if (!hasSavedField) {
      return (
        <div className="workspace-note-card">
          Save this field to keep a history of analysis runs.
        </div>
      );
    }

    if (!analysisHistory.length) {
      return (
        <div className="workspace-note-card">
          No analysis history is available for this field yet.
        </div>
      );
    }

    return (
      <div className="workspace-selection-history-list">
        {analysisHistory.map((item) => {
          const canOpenItem = isUsableAnalysis(item);

          return (
            <article
              key={item.analysisId || `${item.analysisDate || item.analysisCreatedAt || 'analysis'}-${item.status || 'status'}`}
              className="workspace-history-row"
            >
              <div>
                <strong>{formatWorkspaceDateTime(item.analysisDate || item.analysisCreatedAt, 'Pending date')}</strong>
                <p className="workspace-helper-text">
                  {(item.predictedClass || 'Result pending')} · {item.status || 'Recorded'}
                </p>
              </div>

              {canOpenItem ? (
                <button
                  type="button"
                  className="text-btn"
                  onClick={() => onOpenAnalysis?.(item, fieldRecord)}
                >
                  View
                </button>
              ) : (
                <span className="status-pill neutral">{item.status || 'Pending'}</span>
              )}
            </article>
          );
        })}
      </div>
    );
  };

  if (!hasGeometry && !hasSavedField) {
    return (
      <div className="workspace-selection-card" data-guide="selected-field-section">
        <div className="workspace-inline-title workspace-selection-heading">
          <div>
            <strong style={{ fontSize: '1rem' }}>Selected field</strong>
            <p className="workspace-helper-text">
              Select, upload, or draw a field to review saved context, comments, and history.
            </p>
          </div>
        </div>

        <div className="workspace-note-card">
          The selected field card appears here after you choose a boundary.
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      className="workspace-selection-card"
      data-guide="selected-field-section"
    >
      <div className="workspace-inline-title workspace-selection-heading">
        <div>
          <strong style={{ fontSize: '1rem' }}>Selected field</strong>
          <p className="workspace-helper-text">
            {hasSavedField
              ? 'Review the saved field, open comments, or jump into result history.'
              : 'Save this boundary to unlock comments and stored analysis history.'}
          </p>
        </div>

        {displayedRiskLevel ? (
          <span className={`status-pill ${getRiskTone(displayedRiskLevel)}`}>
            {displayedRiskLevel}
          </span>
        ) : (
          <span className="status-pill neutral">{hasSavedField ? 'Saved' : 'Not saved'}</span>
        )}
      </div>

      <div className="workspace-selection-tabs">
        <SelectionTab
          id="overview"
          label="Overview"
          isActive={activeTab === 'overview'}
          onClick={setActiveTab}
        />
        <SelectionTab
          id="comments"
          label="Comments"
          isActive={activeTab === 'comments'}
          onClick={setActiveTab}
        />
        <SelectionTab
          id="history"
          label="History"
          isActive={activeTab === 'history'}
          onClick={setActiveTab}
        />
      </div>

      <div className="workspace-selection-panel-content">
        {activeTab === 'overview' ? renderOverview() : null}
        {activeTab === 'comments' ? renderComments() : null}
        {activeTab === 'history' ? renderHistory() : null}
      </div>
    </div>
  );
}
