import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  FileText,
  Info,
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
  getFieldSelectionId,
  getFieldSelectionName,
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

const getFarmerStatus = (riskLevel) => {
  if (riskLevel === 'Low') {
    return {
      value: 'Stable',
      tone: 'healthy',
      title: 'The field looks stable',
      action: 'Continue routine monitoring.',
      helper:
        'The current satellite indicators do not show a strong reason for urgent inspection.',
      icon: <CheckCircle2 size={18} />
    };
  }

  if (riskLevel === 'Medium') {
    return {
      value: 'Monitor',
      tone: 'warning',
      title: 'The field needs monitoring',
      action: 'Check this field when possible.',
      helper:
        'The satellite indicators show mixed vegetation signals. This does not confirm crop damage, but it is worth reviewing.',
      icon: <Info size={18} />
    };
  }

  if (riskLevel === 'High') {
    return {
      value: 'Needs attention',
      tone: 'critical',
      title: 'The field needs attention',
      action: 'Field inspection is recommended.',
      helper:
        'The satellite indicators show weak vegetation signals. A field visit can help confirm the cause.',
      icon: <AlertTriangle size={18} />
    };
  }

  return {
    value: 'Not analyzed',
    tone: 'neutral',
    title: 'No land status available',
    action: 'Run an analysis to generate a field report.',
    helper: 'After analysis, this page will show vegetation indicators and land-cover output.',
    icon: <Info size={18} />
  };
};

const getVegetationFarmerText = (ndviValue) => {
  const display = getVegetationLevelDisplay(ndviValue);

  if (display.value === 'High') {
    return {
      ...display,
      action: 'Vegetation signal is strong for the selected image period.'
    };
  }

  if (display.value === 'Moderate') {
    return {
      ...display,
      action: 'Vegetation signal is acceptable but should be monitored.'
    };
  }

  if (display.value === 'Low') {
    return {
      ...display,
      action: 'Vegetation signal is low. Inspecting the parcel is recommended.'
    };
  }

  return {
    ...display,
    action: 'Vegetation signal will appear after analysis.'
  };
};

function ResultHeroMetric({ label, value, children }) {
  return (
    <div className="farmer-report-hero-metric">
      <span>{label}</span>
      {children || <strong>{value}</strong>}
    </div>
  );
}

function FarmerResultCard({ label, value, helper, tone = 'neutral', icon }) {
  return (
    <div className={`farmer-result-card farmer-result-card-${tone}`}>
      <div className="farmer-result-card-head">
        <span>{label}</span>
        {icon ? <span className="farmer-result-card-icon">{icon}</span> : null}
      </div>
      <strong>{value}</strong>
      {helper ? <p>{helper}</p> : null}
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

  const landStatus = getFarmerStatus(activeReport?.riskLevel);
  const vegetationStatus = getVegetationFarmerText(activeReport?.ndviValue);
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

  const latestRunLabel = activeReport?.analysisDate
    ? formatWorkspaceDateTime(activeReport.analysisDate, 'Not available')
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
    <div className="content-page analysis-results-page farmer-report-page">
      <section className="farmer-report-hero glass-panel">
        <div className="farmer-report-hero-copy">
          <div className="page-kicker">Land health report</div>
          <h1 className="page-title">{selectedFieldName}</h1>
          <p className="page-subtitle">
            Satellite-based summary for the selected parcel. The report shows what the imagery suggests and what action is recommended next.
          </p>
        </div>

        <div className="farmer-report-hero-side">
          <div className="farmer-report-hero-metrics">
            <ResultHeroMetric label="Area" value={fieldArea} />
            <ResultHeroMetric
              label="Analysis period"
              value={selectedSeason ? `Season ${selectedSeason}` : 'Not selected'}
            />
            <ResultHeroMetric label="Land status">
              <span className={`status-pill ${landStatus.tone}`}>
                {landStatus.icon}
                {landStatus.value}
              </span>
            </ResultHeroMetric>
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

      {activeReport ? (
        <section className={`farmer-decision-card glass-panel farmer-decision-card-${landStatus.tone}`}>
          <div className="farmer-decision-main">
            <span className="farmer-decision-label">Recommended action</span>
            <h2>{landStatus.title}</h2>
            <p>{landStatus.helper}</p>
            <strong>{landStatus.action}</strong>
          </div>

          <div className="farmer-decision-details">
            <FarmerResultCard
              label="Vegetation condition"
              value={vegetationStatus.value}
              helper={vegetationStatus.action}
              tone={getRiskTone(activeReport.riskLevel)}
              icon={<Activity size={16} />}
            />

            <FarmerResultCard
              label="Detected land cover"
              value={activeReport.predictedClass || 'Not analyzed'}
              helper="Model-assisted EuroSAT land-cover class."
              icon={<FileText size={16} />}
            />

            <FarmerResultCard
              label="Model confidence"
              value={activeReport.confidenceLabel}
              helper="Confidence of the land-cover classification."
              icon={<ShieldAlert size={16} />}
            />
          </div>

          <div className="farmer-limitation-note">
            <Info size={16} />
            <span>{ANALYSIS_LIMITATION_NOTE}</span>
          </div>
        </section>
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

      <section className="farmer-report-main-grid">
        <div className="glass-panel report-map-panel">
          <div className="workspace-section-heading">
            <div className="workspace-section-icon">
              <MapPinned size={16} />
            </div>
            <div>
              <strong style={{ fontSize: '1rem' }}>Field map</strong>
              <p className="workspace-helper-text">
                Boundary colored by the latest land status from the analysis.
              </p>
            </div>
          </div>

          <div className="workspace-map-stage report-map-stage farmer-report-map-stage">
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

        <aside className="glass-panel farmer-report-side-panel">
          <div className="workspace-section-heading">
            <div className="workspace-section-icon">
              <CalendarClock size={16} />
            </div>
            <div>
              <strong style={{ fontSize: '1rem' }}>Analysis context</strong>
              <p className="workspace-helper-text">
                Review the latest run and switch between stored seasons.
              </p>
            </div>
          </div>

          <MonitoringSeasonSelector
            value={selectedSeason}
            onChange={onChangeSeason}
            options={seasonOptions}
            compact
          />

          <div className="farmer-context-list">
            <div className="farmer-context-row">
              <span>Latest run</span>
              <strong>{latestRunLabel}</strong>
            </div>

            <div className="farmer-context-row">
              <span>Satellite image date</span>
              <strong>{satelliteDateLabel}</strong>
            </div>

            <div className="farmer-context-row">
              <span>Land-cover class</span>
              <strong>{activeReport?.predictedClass || 'Not available'}</strong>
            </div>

            <div className="farmer-context-row">
              <span>Confidence</span>
              <strong>{activeReport?.confidenceLabel || '—'}</strong>
            </div>
          </div>

          {loadingHistory ? (
            <div className="empty-state compact">Loading field history...</div>
          ) : seasonHistory.length ? (
            <>
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
        <section className="workspace-panel-section glass-panel report-section-card farmer-technical-section">
          <div className="workspace-section-heading">
            <div className="workspace-section-icon">
              <BrainCircuit size={16} />
            </div>
            <div>
              <strong style={{ fontSize: '1rem' }}>Technical details</strong>
              <p className="workspace-helper-text">
                These values explain how the land status was formed. NDVI and EVI describe vegetation signal; ResNet-50 provides land-cover classification.
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
              explanation="EVI is a supporting vegetation indicator that can reduce some background effects."
              icon={<Sprout />}
              accentColor="var(--accent-color)"
            />
          </div>

          <div className="report-technical-grid">
            <FieldMetricCard
              label="Land-cover workflow"
              value="ResNet-50-assisted"
              helper="Transfer-learning-based classification using EuroSAT land-cover labels."
              icon={<BrainCircuit />}
              accentColor="var(--accent-color)"
            />

            <FieldMetricCard
              label="EuroSAT class"
              value={activeReport.euroSatClass || activeReport.predictedClass || 'Not available'}
              helper="Predicted broad land-cover class, not crop disease or yield diagnosis."
              icon={<FileText />}
              accentColor="var(--status-warning)"
            />

            <FieldMetricCard
              label="Model confidence"
              value={activeReport.confidenceLabel}
              helper="Confidence score returned by the classifier."
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
              helper="Processing notes such as unavailable EVI or low classification confidence."
              icon={<ShieldAlert />}
              accentColor="var(--status-critical)"
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
