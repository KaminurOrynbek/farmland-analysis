import React from 'react';
import {
  CalendarClock,
  FileText,
  MapPinned,
  Play,
  ShieldAlert
} from 'lucide-react';
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

export default function WorkspaceSelectionCard({
  fieldRecord,
  riskLevel,
  latestAnalysisAt,
  canRunAnalysis,
  runAnalysisReason,
  canViewReport,
  onRunAnalysis,
  onOpenReport
}) {
  const fieldName = fieldRecord?.name || 'No field selected';
  const fieldArea = fieldRecord?.area_ha
    ? formatAreaMeasure(fieldRecord.area_ha)
    : 'Area pending';
  const statusLabel = riskLevel || 'Not analyzed';

  return (
    <aside className="workspace-side-panel workspace-compact-panel glass-panel">
      <section className="workspace-panel-section">
        <div className="workspace-section-heading">
          <div className="workspace-section-icon">
            <MapPinned size={16} />
          </div>
          <div>
            <strong style={{ fontSize: '0.96rem' }}>Selected field</strong>
          </div>
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

        <div className="workspace-selection-list">
          <DetailRow
            icon={<MapPinned size={14} />}
            label="Area"
            value={fieldArea}
          />
          <DetailRow
            icon={<ShieldAlert size={14} />}
            label="Latest status"
            value={statusLabel}
          />
          <DetailRow
            icon={<CalendarClock size={14} />}
            label="Latest analysis"
            value={formatWorkspaceDateTime(latestAnalysisAt, 'No analysis yet')}
          />
        </div>

        <div className="workspace-inline-actions">
          <button
            type="button"
            className="primary-btn"
            onClick={() => onRunAnalysis?.()}
            disabled={!canRunAnalysis}
            title={runAnalysisReason || undefined}
            data-guide="run-analysis-card"
          >
            <Play size={16} />
            Run analysis
          </button>

          <button
            type="button"
            className="secondary-btn"
            onClick={() => onOpenReport?.()}
            disabled={!canViewReport}
            data-guide="open-report-card"
          >
            <FileText size={16} />
            Open report
          </button>
        </div>

        {runAnalysisReason ? (
          <p className="workspace-helper-text" style={{ margin: 0 }}>
            {runAnalysisReason}
          </p>
        ) : null}
      </section>
    </aside>
  );
}
