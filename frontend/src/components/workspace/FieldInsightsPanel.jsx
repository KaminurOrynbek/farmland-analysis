import React, { useMemo } from 'react';
import {
  Activity,
  BrainCircuit,
  FileText,
  Leaf,
  MapPinned,
  Satellite,
  ShieldAlert,
  Sprout
} from 'lucide-react';
import { formatAreaMeasure, formatIndex } from '../../utils/analysisFormatters';
import {
  buildHistoryAnalysisDisplay,
  createFieldFallbackRecord,
  filterAnalysesBySeason,
  formatWorkspaceDateTime,
  getActiveAnalysisDisplay,
  getConditionSummaryDisplay,
  getFieldSelectionId,
  getFieldSelectionName,
  getRecommendedActionSummary,
  getRiskTone,
  getVegetationLevelDisplay
} from '../../utils/fieldAnalysisUtils';
import AnalysisTimeline from './AnalysisHistoryList';
import NoAnalysisState from './NoAnalysisState';
import FieldSummaryCard from './FieldMetricCard';

export default function FieldInsightsPanel({
  selectedField,
  fieldRecord,
  fieldAnalyses = [],
  selectedSeason,
  analysisResults,
  analysisStarted,
  latestAnalysisAt,
  satelliteFetchResult,
  backendHealthy,
  contextNotice,
  onOpenReport,
  onRunAnalysis
}) {
  const currentFieldId = getFieldSelectionId(selectedField);
  const fallbackField = useMemo(
    () => createFieldFallbackRecord(selectedField, currentFieldId),
    [currentFieldId, selectedField]
  );
  const activeField = fieldRecord || fallbackField;
  const latestStoredAnalysis = filterAnalysesBySeason(fieldAnalyses, selectedSeason)[0] || fieldAnalyses[0] || null;
  const activeAnalysis = getActiveAnalysisDisplay({
    analysisStarted,
    analysisResults,
    latestAnalysisAt,
    fallbackHistoryAnalysis: latestStoredAnalysis
  });

  const analysisSummary = useMemo(
    () => activeAnalysis || buildHistoryAnalysisDisplay(latestStoredAnalysis),
    [activeAnalysis, latestStoredAnalysis]
  );

  const fieldName = activeField?.name || getFieldSelectionName(selectedField);
  const fieldArea = activeField?.area_ha ? formatAreaMeasure(activeField.area_ha) : 'Area will be calculated after save';
  const roleLabel = activeField?.role || 'Draft field';
  const filteredHistory = filterAnalysesBySeason(fieldAnalyses, selectedSeason);
  const analysisCount = filteredHistory.length;
  const latestSourceLabel = satelliteFetchResult?.dataset
    ? `${satelliteFetchResult.dataset} · ${satelliteFetchResult.acquisition_date || 'Date pending'}`
    : 'Fetch satellite data to attach source metadata to this field.';
  const vegetationLevel = getVegetationLevelDisplay(analysisSummary?.ndviValue);
  const conditionSummary = getConditionSummaryDisplay(analysisSummary);
  const topRecommendation = getRecommendedActionSummary(analysisSummary?.recommendations);

  return (
    <aside className="workspace-side-panel glass-panel">
      {contextNotice ? (
        <div className="workspace-notice-banner">
          {contextNotice}
        </div>
      ) : null}

      <section className="workspace-panel-section">
        <div className="workspace-section-heading">
          <div className="workspace-section-icon">
            <MapPinned size={16} />
          </div>
          <div>
            <strong style={{ fontSize: '0.96rem' }}>{fieldName || 'Field workspace'}</strong>
            <p className="workspace-helper-text">
              Geometry, imagery context, analysis results, and history stay connected to this field.
            </p>
          </div>
        </div>

        <div className="workspace-metric-grid">
          <FieldSummaryCard
            label="Field area"
            value={fieldArea}
            helper={`Role: ${roleLabel}`}
            icon={<MapPinned />}
          />
          <FieldSummaryCard
            label="Stored analyses"
            value={analysisCount}
            helper={`Season ${selectedSeason} view`}
            icon={<FileText />}
            accentColor="var(--status-healthy)"
          />
        </div>

        {(activeField?.owner_name || activeField?.owner_email) ? (
          <div className="workspace-note-card">
            <strong>Ownership context</strong>
            <p className="workspace-helper-text">
              {activeField.owner_name || activeField.owner_email}
            </p>
          </div>
        ) : null}
      </section>

      <section className="workspace-panel-section">
        <div className="workspace-section-heading">
          <div className="workspace-section-icon">
            <Satellite size={16} />
          </div>
          <div>
            <strong style={{ fontSize: '0.96rem' }}>Satellite source</strong>
            <p className="workspace-helper-text">{latestSourceLabel}</p>
          </div>
        </div>

        {satelliteFetchResult ? (
          <div className="workspace-note-card">
            <strong>{satelliteFetchResult.dataset || 'Satellite data ready'}</strong>
            <p className="workspace-helper-text">
              Resolution {satelliteFetchResult.resolution || '—'} · Acquisition {satelliteFetchResult.acquisition_date || '—'}
            </p>
          </div>
        ) : (
          <div className="workspace-note-card">
            <strong>Satellite data not fetched yet</strong>
            <p className="workspace-helper-text">
              Fetch source metadata before a fresh run so the field context is complete.
            </p>
          </div>
        )}
      </section>

      <section className="workspace-panel-section">
        <div className="workspace-section-heading">
          <div className="workspace-section-icon">
            <ShieldAlert size={16} />
          </div>
          <div>
            <strong style={{ fontSize: '0.96rem' }}>Field insights</strong>
            <p className="workspace-helper-text">
              Latest screening summary for the selected field.
            </p>
          </div>
        </div>

        {!selectedField && !activeField ? (
          <NoAnalysisState
            title="Select a field to begin"
            description="Choose a saved field from the sidebar or draw a new boundary on the map."
          />
        ) : !analysisSummary ? (
          <NoAnalysisState
            title="No analysis available for this field yet"
            description="Run an analysis to generate field condition, vegetation level, and recommendations."
            primaryAction={{
              label: 'Run Analysis',
              onClick: () => onRunAnalysis?.()
            }}
            secondaryAction={{
              label: 'Open Report Page',
              onClick: () => onOpenReport?.()
            }}
          />
        ) : (
          <>
            <div className="workspace-analysis-status">
              <div>
                <strong>{conditionSummary.value}</strong>
                <p className="workspace-helper-text">
                  {analysisSummary.summary || 'This summary is based on vegetation indicators and model-assisted classification. Field inspection is recommended before major decisions.'}
                </p>
              </div>
              <span className={`status-pill ${getRiskTone(analysisSummary.riskLevel)}`}>
                <ShieldAlert size={14} />
                {analysisSummary.riskLevel || 'Unknown'}
              </span>
            </div>

            <div className="workspace-metric-grid">
              <FieldSummaryCard
                label="Field condition"
                value={conditionSummary.value}
                helper={conditionSummary.helper}
                icon={<Leaf />}
                accentColor="var(--status-healthy)"
              />
              <FieldSummaryCard
                label="Vegetation level"
                value={vegetationLevel.value}
                helper={vegetationLevel.helper}
                icon={<Sprout />}
              />
              <FieldSummaryCard
                label="Risk level"
                value={analysisSummary.riskLevel || 'Unknown'}
                helper={backendHealthy ? 'Use this as a screening signal, then verify in the field.' : 'Demo or offline context may be shown.'}
                icon={<ShieldAlert />}
                accentColor="var(--status-critical)"
              />
              <FieldSummaryCard
                label="Land cover"
                value={analysisSummary.cropType}
                helper={`Model confidence ${analysisSummary.confidenceLabel}`}
                icon={<BrainCircuit />}
                accentColor="#a855f7"
              />
              <FieldSummaryCard
                label="Recommendation"
                value={topRecommendation}
                helper={`Updated ${formatWorkspaceDateTime(analysisSummary.analysisDate, 'Current session')}`}
                icon={<FileText />}
                accentColor="var(--status-warning)"
              />
            </div>

            <div className="workspace-recommendations">
              <strong>Recommended next steps</strong>
              <p className="workspace-helper-text" style={{ marginTop: '6px' }}>
                These suggestions are screening guidance only. Field inspection is recommended to confirm current conditions.
              </p>
              <div className="workspace-recommendation-list">
                {analysisSummary.recommendations.map((item, index) => (
                  <div key={`${item}-${index}`} className="workspace-recommendation-item">
                    <span className="workspace-empty-step-number">{index + 1}</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="page-hero-actions">
              <button type="button" className="secondary-btn" onClick={() => onOpenReport?.()}>
                <FileText size={16} />
                Open full report
              </button>
              <button type="button" className="primary-btn" onClick={() => onRunAnalysis?.()}>
                Run New Analysis
              </button>
            </div>
          </>
        )}
      </section>

      <section className="workspace-panel-section">
        <div className="workspace-section-heading">
          <div className="workspace-section-icon">
            <FileText size={16} />
          </div>
          <div>
            <strong style={{ fontSize: '0.96rem' }}>Analysis timeline</strong>
            <p className="workspace-helper-text">
              Stored analysis history for {fieldName}. The current season filter is shown here.
            </p>
          </div>
        </div>

        <AnalysisTimeline
          items={fieldAnalyses}
          selectedSeason={selectedSeason}
          emptyText="No completed analyses are stored for this field in the selected season."
        />
      </section>

      <section className="workspace-panel-section">
        <div className="workspace-section-heading">
          <div className="workspace-section-icon">
            <Activity size={16} />
          </div>
          <div>
            <strong style={{ fontSize: '0.96rem' }}>Advanced indicators</strong>
            <p className="workspace-helper-text">
              NDVI and EVI support the screening summary above and should be reviewed alongside field observations.
            </p>
          </div>
        </div>

        <div className="workspace-metric-grid">
          <FieldSummaryCard
            label="NDVI"
            value={formatIndex(analysisSummary?.ndviValue)}
            helper="Vegetation index from visible and near-infrared reflectance."
            icon={<Activity />}
            accentColor="var(--status-healthy)"
          />
          <FieldSummaryCard
            label="EVI"
            value={formatIndex(analysisSummary?.eviValue)}
            helper="Vegetation index designed to be more stable under soil and atmospheric effects."
            icon={<Sprout />}
          />
        </div>
      </section>
    </aside>
  );
}
