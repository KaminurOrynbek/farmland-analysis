import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BrainCircuit,
  CalendarClock,
  FileText,
  MapPinned,
  ShieldAlert,
  Sprout
} from 'lucide-react';
import { fetchAnalysisHistory } from '../api/client';
import AnalysisHistoryList from '../components/workspace/AnalysisHistoryList';
import FieldMap from '../components/workspace/FieldMap';
import NoAnalysisState from '../components/workspace/NoAnalysisState';
import FieldMetricCard from '../components/workspace/FieldMetricCard';
import MonitoringSeasonSelector from '../components/workspace/MonitoringSeasonSelector';
import { APP_PAGES } from '../constants/appPages';
import { formatAreaMeasure, formatIndex } from '../utils/analysisFormatters';
import {
  ANALYSIS_LIMITATION_NOTE,
  buildSeasonOptions,
  createFieldFallbackRecord,
  filterAnalysesBySeason,
  formatWorkspaceDate,
  formatWorkspaceDateTime,
  getConditionSummaryDisplay,
  getFieldSelectionId,
  getFieldSelectionName,
  getInspectionMessage,
  getRiskTone,
  getVegetationIndexLevelDisplay,
  getVegetationLevelDisplay,
  normalizeAnalysisRecord,
  sortAnalysesByNewest
} from '../utils/fieldAnalysisUtils';

const buildGeoJsonFromSelection = (selectedField, fieldId, fieldName) => {
  if (!selectedField?.geometry) {
    return null;
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          ...selectedField.properties,
          id: fieldId,
          field_id: fieldId,
          name: fieldName
        },
        geometry: selectedField.geometry
      }
    ]
  };
};

function SummaryCard({ label, value, helper, tone = 'neutral' }) {
  return (
    <div className={`report-summary-item report-summary-item-${tone}`}>
      <span className="report-summary-label">{label}</span>
      <strong className="report-summary-value">{value}</strong>
      {helper ? <p className="workspace-helper-text">{helper}</p> : null}
    </div>
  );
}

function IndicatorLevelCard({
  title,
  metricName,
  rawValue,
  level,
  tone,
  helper,
  explanation,
  icon,
  accentColor
}) {
  const scaleLevels = ['Low', 'Moderate', 'High'];

  return (
    <div className="report-indicator-card glass-panel">
      <div className="workspace-metric-head">
        <span className="workspace-metric-label">{title}</span>
        {icon ? React.cloneElement(icon, { size: 18, color: accentColor }) : null}
      </div>

      <div className="report-indicator-copy">
        <div className="report-indicator-topline">
          <strong className="report-indicator-level">{level}</strong>
          <span className={`status-pill ${tone}`}>{metricName}</span>
        </div>

        <span className="report-indicator-raw">
          {metricName} value {rawValue}
        </span>
      </div>

      <div className="report-indicator-scale" aria-hidden="true">
        {scaleLevels.map((scaleLevel) => {
          const isActive = scaleLevel === level;

          return (
            <span
              key={scaleLevel}
              className={`report-indicator-scale-step ${isActive ? `active ${tone}` : ''}`}
            >
              {scaleLevel}
            </span>
          );
        })}
      </div>

      <p className="workspace-metric-helper">{helper}</p>
      <p className="workspace-helper-text">{explanation}</p>
    </div>
  );
}

export default function AnalysisResultsPage({
  user,
  backendHealthy,
  analysisResults,
  selectedField,
  setSelectedField,
  geoJsonData,
  fieldLayerVisible,
  analysisStarted,
  latestAnalysisAt,
  selectedSeason,
  onChangeSeason,
  onNavigate,
  onRunNewAnalysis,
  onOpenAnalysis,
  refreshKey
}) {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [notice, setNotice] = useState('');

  const selectedFieldId = getFieldSelectionId(selectedField);
  const selectedFieldName = getFieldSelectionName(selectedField);
  const fieldRecord = useMemo(
    () => createFieldFallbackRecord(selectedField, selectedFieldId),
    [selectedField, selectedFieldId]
  );

  useEffect(() => {
    let isActive = true;

    const loadHistory = async () => {
      setLoadingHistory(true);

      try {
        const response = await fetchAnalysisHistory(
          selectedFieldId ? { field_id: selectedFieldId } : {}
        );

        if (!isActive) {
          return;
        }

        setHistory(sortAnalysesByNewest((response.data || []).map(normalizeAnalysisRecord)));
        setNotice('');
      } catch {
        if (!isActive) {
          return;
        }

        setHistory([]);
        setNotice(
          backendHealthy
            ? 'Field history could not be refreshed. Showing the latest available results context.'
            : 'Backend is not connected. Stored analysis history is unavailable right now.'
        );
      } finally {
        if (isActive) {
          setLoadingHistory(false);
        }
      }
    };

    void loadHistory();

    return () => {
      isActive = false;
    };
  }, [backendHealthy, refreshKey, selectedFieldId]);

  const fieldHistory = useMemo(() => {
    if (!selectedFieldId && !selectedFieldName) {
      return [];
    }

    return sortAnalysesByNewest(
      history.filter((item) => {
        if (selectedFieldId) {
          return String(item.fieldId) === String(selectedFieldId);
        }

        return item.fieldName === selectedFieldName;
      })
    );
  }, [history, selectedFieldId, selectedFieldName]);

  const seasonOptions = useMemo(() => buildSeasonOptions(fieldHistory), [fieldHistory]);

  const seasonHistory = useMemo(
    () => filterAnalysesBySeason(fieldHistory, selectedSeason),
    [fieldHistory, selectedSeason]
  );

  const latestSeasonAnalysis = seasonHistory[0] || null;
  const previousSeasonRuns = seasonHistory.slice(1);

  const currentSessionAnalysis = analysisStarted
    ? normalizeAnalysisRecord({
        ...analysisResults,
        analysisDate: latestAnalysisAt || analysisResults.analysisDate
      })
    : null;

  const activeReport = (
    currentSessionAnalysis?.analysisId &&
    String(currentSessionAnalysis.seasonYear) === String(selectedSeason)
  )
    ? currentSessionAnalysis
    : latestSeasonAnalysis;

  const conditionSummary = getConditionSummaryDisplay(activeReport);
  const vegetationLevel = getVegetationLevelDisplay(activeReport?.ndviValue);
  const ndviLevel = getVegetationIndexLevelDisplay('ndvi', activeReport?.ndviValue);
  const eviLevel = getVegetationIndexLevelDisplay('evi', activeReport?.eviValue);

  const analysisGeoJsonData = useMemo(() => (
    geoJsonData?.features?.length
      ? geoJsonData
      : buildGeoJsonFromSelection(selectedField, selectedFieldId, selectedFieldName)
  ), [geoJsonData, selectedField, selectedFieldId, selectedFieldName]);

  const fieldArea = fieldRecord?.area_ha
    ? formatAreaMeasure(fieldRecord.area_ha)
    : activeReport?.areaHectares
      ? formatAreaMeasure(activeReport.areaHectares)
      : 'Area pending';

  const analysisFieldContext = useMemo(() => {
    if (!analysisGeoJsonData?.features?.[0]?.geometry) {
      return null;
    }

    return {
      id: fieldRecord?.id || selectedFieldId,
      name: fieldRecord?.name || selectedFieldName,
      area_ha: fieldRecord?.area_ha || null,
      role: fieldRecord?.role || null,
      owner_name: fieldRecord?.owner_name || null,
      owner_email: fieldRecord?.owner_email || null,
      geometry: analysisGeoJsonData.features[0].geometry
    };
  }, [analysisGeoJsonData, fieldRecord, selectedFieldId, selectedFieldName]);

  const satelliteDateLabel = activeReport?.satelliteAcquisitionDate
    ? formatWorkspaceDate(activeReport.satelliteAcquisitionDate)
    : activeReport?.startDate && activeReport?.endDate
      ? `${formatWorkspaceDate(activeReport.startDate)} to ${formatWorkspaceDate(activeReport.endDate)}`
      : 'Not available';

  if (!selectedField && !activeReport) {
    return (
      <div className="content-page">
        <NoAnalysisState
          title="No analysis available yet"
          description="Select or save a field in Workspace, then run an analysis to open Analysis Results."
          primaryAction={{
            label: `Open ${APP_PAGES.WORKSPACE}`,
            onClick: () => onNavigate(APP_PAGES.WORKSPACE)
          }}
          secondaryAction={{
            label: `Open ${APP_PAGES.FIELDS}`,
            onClick: () => onNavigate(APP_PAGES.FIELDS)
          }}
        />
      </div>
    );
  }

  return (
    <div className="content-page analysis-results-page">
      <section className="page-hero glass-panel report-header">
        <div>
          <div className="page-kicker">{APP_PAGES.ANALYSIS_RESULTS}</div>
          <h1 className="page-title">{selectedFieldName}</h1>
          <p className="page-subtitle">
            Review the satellite-based screening priority, vegetation indicators, and model-assisted land-cover result.
          </p>
        </div>

        <div className="report-header-side">
          <div className="report-header-meta-grid">
            <div className="page-hero-meta-card">
              <span className="page-hero-meta-label">Area</span>
              <strong>{fieldArea}</strong>
            </div>

            <div className="page-hero-meta-card">
              <span className="page-hero-meta-label">Analysis period</span>
              <strong>{selectedSeason ? `Season ${selectedSeason}` : 'Not selected'}</strong>
            </div>

            <div className="page-hero-meta-card report-risk-card">
              <span className="page-hero-meta-label">Screening priority</span>
              <span className={`status-pill ${getRiskTone(activeReport?.riskLevel)}`}>
                <ShieldAlert size={14} />
                {conditionSummary.value}
              </span>
            </div>
          </div>

          <div className="page-hero-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => onNavigate(APP_PAGES.WORKSPACE)}
            >
              Open Workspace
            </button>

            <button type="button" className="primary-btn" onClick={() => onRunNewAnalysis?.()}>
              Run new analysis
            </button>
          </div>
        </div>
      </section>

      {notice ? <div className="workspace-notice-banner">{notice}</div> : null}

      <section className="workspace-panel-section glass-panel report-section-card">
        <div className="workspace-section-heading">
          <div className="workspace-section-icon">
            <FileText size={16} />
          </div>
          <div>
            <strong style={{ fontSize: '1rem' }}>Remote-sensing screening result</strong>
            <p className="workspace-helper-text">
              Summary of the latest satellite-based analysis for this field.
            </p>
          </div>
        </div>

        {activeReport ? (
          <>
            <div className="workspace-note-card">
              <strong>{getInspectionMessage(activeReport)}</strong>
              <p className="workspace-helper-text">{ANALYSIS_LIMITATION_NOTE}</p>
            </div>

            <div className="report-summary-grid">
              <SummaryCard
                label="Screening priority"
                value={conditionSummary.value}
                helper={conditionSummary.helper}
                tone={getRiskTone(activeReport.riskLevel)}
              />
              <SummaryCard
                label="Vegetation signal"
                value={vegetationLevel.value}
                helper={vegetationLevel.helper}
              />
              <SummaryCard
                label="Detected land cover"
                value={activeReport.predictedClass || 'Not analyzed'}
                helper="ResNet-50-assisted EuroSAT land-cover classification."
              />
              <SummaryCard
                label="Confidence"
                value={activeReport.confidenceLabel}
                helper="Model confidence for the land-cover classification."
              />
              <SummaryCard
                label="Analysis date"
                value={formatWorkspaceDateTime(activeReport.analysisDate, 'Not available')}
                helper="Time when this analysis run was recorded."
              />
              <SummaryCard
                label="Satellite image date"
                value={satelliteDateLabel}
                helper="Acquisition date when available, otherwise the requested image window."
              />
            </div>
          </>
        ) : (
          <NoAnalysisState
            title={`No analysis available for Season ${selectedSeason}`}
            description="Choose another season or run a new analysis for this field."
            primaryAction={{
              label: 'Run new analysis',
              onClick: () => onRunNewAnalysis?.()
            }}
            secondaryAction={{
              label: 'Open Workspace',
              onClick: () => onNavigate(APP_PAGES.WORKSPACE)
            }}
          />
        )}
      </section>

      <section className="report-main-layout">
        <div className="glass-panel report-map-panel">
          <div className="workspace-section-heading">
            <div className="workspace-section-icon">
              <MapPinned size={16} />
            </div>
            <div>
              <strong style={{ fontSize: '1rem' }}>Field map</strong>
              <p className="workspace-helper-text">
                Selected boundary with the latest screening priority overlay.
              </p>
            </div>
          </div>

          <div className="workspace-map-stage report-map-stage">
            <FieldMap
              user={user}
              backendHealthy={backendHealthy}
              analysisStarted={Boolean(activeReport?.analysisId)}
              isAnalyzing={false}
              geoJsonData={analysisGeoJsonData}
              selectedField={selectedField}
              setSelectedField={setSelectedField}
              fieldLayerVisible={Boolean(analysisGeoJsonData) || fieldLayerVisible}
              analysisResults={activeReport || analysisResults}
              fieldRiskLevel={activeReport?.riskLevel}
              fieldName={selectedFieldName}
              hasStoredAnalysis={Boolean(activeReport?.analysisId)}
              readOnly
              showDemoData={false}
            />
          </div>
        </div>

        <aside className="glass-panel report-summary-panel">
          <div className="workspace-section-heading">
            <div className="workspace-section-icon">
              <CalendarClock size={16} />
            </div>
            <div>
              <strong style={{ fontSize: '1rem' }}>Analysis history</strong>
              <p className="workspace-helper-text">
                Review stored runs for the selected analysis period.
              </p>
            </div>
          </div>

          <MonitoringSeasonSelector
            value={selectedSeason}
            onChange={onChangeSeason}
            options={seasonOptions}
            compact
          />

          {loadingHistory ? (
            <div className="empty-state compact">Loading field history...</div>
          ) : seasonHistory.length ? (
            <>
              <div className="workspace-note-card">
                <strong>Latest run</strong>
                <p className="workspace-helper-text">
                  {`${formatWorkspaceDateTime(seasonHistory[0].analysisDate, 'Analysis date pending')} · ${seasonHistory[0].predictedClass || 'Land cover unavailable'} · ${seasonHistory[0].confidenceLabel}`}
                </p>
              </div>

              {previousSeasonRuns.length ? (
                <AnalysisHistoryList
                  items={previousSeasonRuns}
                  selectedSeason={selectedSeason}
                  emptyText={`No previous stored runs for Season ${selectedSeason}.`}
                  onItemClick={(analysisItem) => onOpenAnalysis?.(analysisItem, analysisFieldContext)}
                />
              ) : (
                <div className="workspace-note-card">
                  No previous stored runs for this season yet.
                </div>
              )}
            </>
          ) : (
            <div className="workspace-note-card">
              {`No stored analyses for Season ${selectedSeason}.`}
            </div>
          )}
        </aside>
      </section>

      {activeReport ? (
        <section className="workspace-panel-section glass-panel report-section-card">
          <div className="workspace-section-heading">
            <div className="workspace-section-icon">
              <BrainCircuit size={16} />
            </div>
            <div>
              <strong style={{ fontSize: '1rem' }}>Technical details</strong>
              <p className="workspace-helper-text">
                NDVI and EVI are vegetation indicators. Land-cover output is a model-assisted EuroSAT classification intended for monitoring support.
              </p>
            </div>
          </div>

          <div className="report-indicator-grid">
            <IndicatorLevelCard
              title="Vegetation greenness"
              metricName="NDVI"
              rawValue={formatIndex(activeReport.ndviValue)}
              level={ndviLevel.value}
              tone={ndviLevel.tone}
              helper={ndviLevel.helper}
              explanation="NDVI is calculated from near-infrared and red reflectance to describe vegetation greenness."
              icon={<Activity />}
              accentColor="var(--status-healthy)"
            />

            <IndicatorLevelCard
              title="Vegetation vigor"
              metricName="EVI"
              rawValue={formatIndex(activeReport.eviValue)}
              level={eviLevel.value}
              tone={eviLevel.tone}
              helper={eviLevel.helper}
              explanation="EVI is used as a supporting vegetation indicator when background brightness may affect the image."
              icon={<Sprout />}
              accentColor="var(--accent-color)"
            />
          </div>

          <div className="report-technical-grid">
            <FieldMetricCard
              label="Land-cover workflow"
              value="ResNet-50-assisted"
              helper="Model-assisted classification workflow used for EuroSAT land-cover labels."
              icon={<BrainCircuit />}
              accentColor="var(--accent-color)"
            />
            <FieldMetricCard
              label="EuroSAT class"
              value={activeReport.euroSatClass || activeReport.predictedClass || 'Not available'}
              helper="Predicted land-cover label from the latest stored run."
              icon={<FileText />}
              accentColor="var(--status-warning)"
            />
            <FieldMetricCard
              label="Model confidence"
              value={activeReport.confidenceLabel}
              helper="Confidence score returned by the land-cover classifier."
              icon={<ShieldAlert />}
              accentColor="var(--status-healthy)"
            />
            <FieldMetricCard
              label="Satellite source"
              value={activeReport.satelliteSource || 'Not available'}
              helper="Source recorded for the imagery request used by this run."
              icon={<MapPinned />}
              accentColor="var(--status-warning)"
            />
            <FieldMetricCard
              label="Cloud coverage"
              value={activeReport.cloudCoverage === null ? 'Unknown' : `${activeReport.cloudCoverage}%`}
              helper="Returned only when image-quality metadata is available."
              icon={<CalendarClock />}
              accentColor="var(--accent-color)"
            />
            <FieldMetricCard
              label="Quality flags"
              value={activeReport.qualityFlags?.length ? activeReport.qualityFlags.join(', ') : 'None'}
              helper="Transparent processing notes such as unavailable EVI or low classification confidence."
              icon={<ShieldAlert />}
              accentColor="var(--status-critical)"
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
