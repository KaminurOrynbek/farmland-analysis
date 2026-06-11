import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BrainCircuit,
  Layers3,
  Leaf,
  MapPinned,
  ShieldCheck
} from 'lucide-react';
import { fetchAnalysisHistory } from '../api/client';
import FieldMap from '../components/workspace/FieldMap';
import NoAnalysisState from '../components/workspace/NoAnalysisState';
import { APP_PAGES } from '../constants/appPages';
import { formatAreaMeasure, formatIndex } from '../utils/analysisFormatters';
import {
  createFieldFallbackRecord,
  filterAnalysesBySeason,
  formatWorkspaceDateTime,
  getCurrentSeasonYear,
  getFieldSelectionId,
  getFieldSelectionName,
  getVegetationIndexLevelDisplay,
  normalizeAnalysisRecord,
  sortAnalysesByNewest
} from '../utils/fieldAnalysisUtils';

const buildGeoJsonFromSelection = (selectedField, fieldId, fieldName) => {
  if (!selectedField?.geometry) return null;

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

const hasMeaningfulAnalysis = (analysis) => (
  Boolean(
    analysis?.analysisId ||
    analysis?.predictedClass ||
    analysis?.riskLevel ||
    analysis?.ndviValue !== null && analysis?.ndviValue !== undefined ||
    analysis?.eviValue !== null && analysis?.eviValue !== undefined
  )
);

const getHealthSummary = (riskLevel) => {
  if (riskLevel === 'Low') {
    return {
      tone: 'healthy',
      label: 'Healthy',
      title: 'The field looks stable',
      text: 'NDVI and EVI indicate good vegetation condition for the selected season.'
    };
  }

  if (riskLevel === 'Medium') {
    return {
      tone: 'warning',
      label: 'Moderate',
      title: 'The field needs attention',
      text: 'Vegetation indicators show mixed field condition. Review the map and monitor this parcel.'
    };
  }

  if (riskLevel === 'High' || riskLevel === 'Critical') {
    return {
      tone: 'critical',
      label: 'Needs attention',
      title: 'The field may be stressed',
      text: 'NDVI and EVI show weak vegetation signals. This parcel should be checked.'
    };
  }

  return {
    tone: 'neutral',
    label: 'Not analyzed',
    title: 'No health result available',
    text: 'Run an analysis to calculate NDVI, EVI, and field health status.'
  };
};

function ResultMetricCard({ icon, label, value, helper, tone = 'neutral', badge }) {
  return (
    <article className={`analysis-results-highlight-card tone-${tone}`}>
      <div className="analysis-results-highlight-head">
        <span className={`analysis-results-highlight-icon tone-${tone}`}>
          {icon}
        </span>
        <span className="analysis-results-highlight-label">{label}</span>
      </div>

      <div className="analysis-results-highlight-main">
        <strong>{value}</strong>
        {badge ? <span className={`status-pill ${tone}`}>{badge}</span> : null}
      </div>

      <p>{helper}</p>
    </article>
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
  onNavigate,
  onRunNewAnalysis,
  refreshKey
}) {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [notice, setNotice] = useState('');

  const selectedFieldId = getFieldSelectionId(selectedField);
  const selectedFieldName = getFieldSelectionName(selectedField);

  const selectedSeasonLabel = useMemo(() => (
    typeof selectedSeason === 'object' && selectedSeason !== null
      ? String(selectedSeason.seasonYear || getCurrentSeasonYear())
      : String(selectedSeason || getCurrentSeasonYear())
  ), [selectedSeason]);

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

        if (!isActive) return;

        setHistory(sortAnalysesByNewest((response.data || []).map(normalizeAnalysisRecord)));
        setNotice('');
      } catch {
        if (!isActive) return;

        setHistory([]);
        setNotice(
          backendHealthy
            ? 'Field history could not be refreshed. Showing the latest available result.'
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
    if (!selectedFieldId && !selectedFieldName) return [];

    return sortAnalysesByNewest(
      history.filter((item) => {
        if (selectedFieldId) {
          return String(item.fieldId) === String(selectedFieldId);
        }

        return item.fieldName === selectedFieldName;
      })
    );
  }, [history, selectedFieldId, selectedFieldName]);

  const seasonHistory = useMemo(
    () => filterAnalysesBySeason(fieldHistory, selectedSeasonLabel),
    [fieldHistory, selectedSeasonLabel]
  );

  const currentSessionAnalysis = useMemo(() => (
    analysisStarted
      ? normalizeAnalysisRecord({
          ...analysisResults,
          analysisDate: latestAnalysisAt || analysisResults.analysisDate
        })
      : null
  ), [analysisResults, analysisStarted, latestAnalysisAt]);

  const latestSeasonAnalysis = seasonHistory[0] || null;

  const activeReport =
    hasMeaningfulAnalysis(currentSessionAnalysis) &&
    String(currentSessionAnalysis?.seasonYear) === selectedSeasonLabel
      ? currentSessionAnalysis
      : latestSeasonAnalysis;

  const fallbackReport = selectedFieldId
    ? fieldHistory.find((item) => hasMeaningfulAnalysis(item)) || null
    : null;

  const contextReport = activeReport || fallbackReport;

  const displayFieldName =
    selectedFieldName !== 'Unnamed Field'
      ? selectedFieldName
      : contextReport?.fieldName || selectedFieldName;

  const fieldArea = fieldRecord?.area_ha
    ? formatAreaMeasure(fieldRecord.area_ha)
    : contextReport?.areaHectares
      ? formatAreaMeasure(contextReport.areaHectares)
      : 'Area pending';

  const latestRunLabel = contextReport?.analysisDate
    ? formatWorkspaceDateTime(contextReport.analysisDate, 'Not available')
    : loadingHistory
      ? 'Loading...'
      : 'Not available';

  const analysisGeoJsonData = useMemo(() => (
    geoJsonData?.features?.length
      ? geoJsonData
      : buildGeoJsonFromSelection(selectedField, selectedFieldId, selectedFieldName)
  ), [geoJsonData, selectedField, selectedFieldId, selectedFieldName]);

  const healthSummary = getHealthSummary(activeReport?.riskLevel);
  const ndviDisplay = getVegetationIndexLevelDisplay('ndvi', activeReport?.ndviValue);
  const eviDisplay = getVegetationIndexLevelDisplay('evi', activeReport?.eviValue);

  const confidenceTone = useMemo(() => {
    const numeric = Number(activeReport?.confidence);

    if (!Number.isFinite(numeric)) return 'neutral';

    const percentage = numeric <= 1 ? numeric * 100 : numeric;

    if (percentage >= 75) return 'healthy';
    if (percentage >= 55) return 'warning';
    return 'critical';
  }, [activeReport?.confidence]);

  if (!selectedField && !activeReport) {
    return (
      <div className="content-page">
        <NoAnalysisState
          title="No analysis available yet"
          description="Select or save a field in Workspace, then run an analysis to open the land health report."
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
      <section className="analysis-results-hero glass-panel">
        <div className="analysis-results-hero-copy">
          <div className="page-kicker">Field health report</div>
          <h1 className="page-title">{displayFieldName}</h1>
          <p className="page-subtitle">
            Satellite-based result for the selected parcel and season.
          </p>

          <div className="analysis-results-meta-strip">
            <div className="analysis-results-meta-pill">
              <span>Season</span>
              <strong>{selectedSeasonLabel}</strong>
            </div>

            <div className="analysis-results-meta-pill">
              <span>Area</span>
              <strong>{fieldArea}</strong>
            </div>

            <div className="analysis-results-meta-pill">
              <span>Latest run</span>
              <strong>{latestRunLabel}</strong>
            </div>
          </div>
        </div>

        <div className={`analysis-results-health-card tone-${healthSummary.tone}`}>
          <span className="analysis-results-card-kicker">Field health status</span>
          <div className="analysis-results-health-main">
            <h2>{healthSummary.title}</h2>
            <span className={`status-pill ${healthSummary.tone}`}>
              {healthSummary.label}
            </span>
          </div>
          <p>{healthSummary.text}</p>
        </div>
      </section>

      {notice ? <div className="workspace-notice-banner">{notice}</div> : null}

      <section className="analysis-results-main-grid clean">
        <div className="analysis-results-map-panel glass-panel">
          <div className="workspace-section-heading">
            <div className="workspace-section-icon">
              <MapPinned size={16} />
            </div>
            <div>
              <strong style={{ fontSize: '1rem' }}>NDVI vegetation map</strong>
              <p className="workspace-helper-text">
                Visual layer based on NDVI values. EVI is included as a separate measurement.
              </p>
            </div>
          </div>

          <div className="workspace-map-stage analysis-results-map-stage">
            <FieldMap
              user={user}
              backendHealthy={backendHealthy}
              analysisStarted={Boolean(contextReport)}
              isAnalyzing={false}
              geoJsonData={analysisGeoJsonData}
              selectedField={selectedField}
              setSelectedField={setSelectedField}
              fieldLayerVisible={Boolean(analysisGeoJsonData) || fieldLayerVisible}
              analysisResults={contextReport || analysisResults}
              fieldRiskLevel={contextReport?.riskLevel}
              fieldName={displayFieldName}
              hasStoredAnalysis={Boolean(contextReport)}
              readOnly
              showDemoData={false}
              showInfoCard={false}
              legendMode={contextReport ? 'analysis' : 'priority'}
            />
          </div>
        </div>

        <div className="analysis-results-summary-stack">
          <section className="analysis-results-measurements glass-panel">
            <div className="workspace-section-heading">
              <div className="workspace-section-icon">
                <Leaf size={16} />
              </div>
              <div>
                <strong style={{ fontSize: '1rem' }}>Vegetation measurements</strong>
                <p className="workspace-helper-text">
                  NDVI and EVI are used together to calculate the final field health status.
                </p>
              </div>
            </div>

            <div className="analysis-results-highlights clean">
              <ResultMetricCard
                icon={<Leaf size={16} />}
                label="NDVI"
                value={formatIndex(activeReport?.ndviValue)}
                helper={ndviDisplay.helper}
                tone={ndviDisplay.tone}
                badge={ndviDisplay.value}
              />

              <ResultMetricCard
                icon={<Activity size={16} />}
                label="EVI"
                value={formatIndex(activeReport?.eviValue)}
                helper={eviDisplay.helper}
                tone={eviDisplay.tone}
                badge={eviDisplay.value}
              />

              <ResultMetricCard
                icon={<ShieldCheck size={16} />}
                label="Risk level"
                value={activeReport?.riskLevel || 'Not available'}
                helper="Calculated from NDVI, EVI, and stressed vegetation area."
                tone={healthSummary.tone}
                badge={healthSummary.label}
              />
            </div>
          </section>

          <div className="analysis-results-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={() => onNavigate(APP_PAGES.WORKSPACE)}
            >
              Open Workspace
            </button>

            <button
              type="button"
              className="primary-btn"
              onClick={() => onRunNewAnalysis?.()}
            >
              Run new analysis
            </button>
          </div>
        </div>
      </section>

      <section className="analysis-results-classification glass-panel">
        <div className="workspace-section-heading">
          <div className="workspace-section-icon">
            <BrainCircuit size={16} />
          </div>
          <div>
            <strong style={{ fontSize: '1rem' }}>Satellite image classification</strong>
            <p className="workspace-helper-text">
              Additional machine-learning context for the analyzed satellite image.
            </p>
          </div>
        </div>

        <div className="analysis-results-classification-grid">
          <ResultMetricCard
            icon={<Layers3 size={16} />}
            label="Detected land-cover type"
            value={contextReport?.predictedClass || 'Not available'}
            helper="Dominant land-cover category detected by the ResNet-50 model."
            tone="neutral"
          />

          <ResultMetricCard
            icon={<ShieldCheck size={16} />}
            label="Model certainty"
            value={contextReport?.confidenceLabel || '—'}
            helper="How certain the model is about this detected land-cover type."
            tone={confidenceTone}
          />
        </div>
      </section>
    </div>
  );
}