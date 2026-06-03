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
  createFieldFallbackRecord,
  filterAnalysesBySeason,
  formatWorkspaceDateTime,
  getActiveAnalysisDisplay,
  getConditionSummaryDisplay,
  getFieldSelectionId,
  getFieldSelectionName,
  getRecommendedActionSummary,
  getRiskTone,
  getVegetationIndexLevelDisplay,
  getVegetationLevelDisplay,
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

function ResultsSummaryItem({ label, value, helper }) {
  return (
    <div className="report-summary-item">
      <span className="report-summary-label">{label}</span>
      <strong className="report-summary-value">{value}</strong>
      {helper ? (
        <p className="workspace-helper-text" style={{ margin: 0 }}>
          {helper}
        </p>
      ) : null}
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
      <p className="workspace-helper-text" style={{ margin: 0 }}>{explanation}</p>
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
        const response = await fetchAnalysisHistory();

        if (!isActive) {
          return;
        }

        setHistory(sortAnalysesByNewest(response.data || []));
        setNotice('');
      } catch {
        if (!isActive) {
          return;
        }

        setHistory([]);
        setNotice(
          backendHealthy
            ? 'Field history could not be refreshed. Showing the latest available results context.'
            : 'Backend is not connected. Demo results context is shown where possible.'
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
  }, [backendHealthy, refreshKey]);

  const fieldHistory = useMemo(() => {
    if (!selectedFieldId && !selectedFieldName) {
      return [];
    }

    return sortAnalysesByNewest(
      history.filter((item) => {
        if (selectedFieldId) {
          return String(item.field_id) === String(selectedFieldId);
        }

        return item.field_name === selectedFieldName;
      })
    );
  }, [history, selectedFieldId, selectedFieldName]);

  const latestStoredAnalysis = fieldHistory[0] || null;
  const activeReport = getActiveAnalysisDisplay({
    analysisStarted,
    analysisResults,
    latestAnalysisAt,
    fallbackHistoryAnalysis: latestStoredAnalysis
  });
  const visibleSeasonHistory = filterAnalysesBySeason(fieldHistory, selectedSeason);
  const conditionSummary = getConditionSummaryDisplay(activeReport);
  const vegetationLevel = getVegetationLevelDisplay(activeReport?.ndviValue);
  const recommendedAction = getRecommendedActionSummary(activeReport?.recommendations);
  const ndviLevel = getVegetationIndexLevelDisplay('ndvi', activeReport?.ndviValue);
  const eviLevel = getVegetationIndexLevelDisplay('evi', activeReport?.eviValue);

  const analysisGeoJsonData = useMemo(() => (
    geoJsonData?.features?.length
      ? geoJsonData
      : buildGeoJsonFromSelection(selectedField, selectedFieldId, selectedFieldName)
  ), [geoJsonData, selectedField, selectedFieldId, selectedFieldName]);

  const fieldArea = fieldRecord?.area_ha
    ? formatAreaMeasure(fieldRecord.area_ha)
    : activeReport?.analyzedArea || 'Area pending';

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

  if (!activeReport) {
    return (
      <div className="content-page">
        {notice ? <div className="workspace-notice-banner">{notice}</div> : null}

        <NoAnalysisState
          title={selectedField ? `No analysis available for ${selectedFieldName} yet` : 'No analysis available yet'}
          description="Select or save a field, fetch satellite data, then run analysis."
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
    <div className="content-page">
      <section className="page-hero glass-panel report-header">
        <div>
          <div className="page-kicker">{APP_PAGES.ANALYSIS_RESULTS}</div>
          <h1 className="page-title">{selectedFieldName}</h1>
          <p className="page-subtitle">
            Map context and screening results stay together here so the field boundary, status, and recommended next steps can be reviewed in one place.
          </p>
        </div>

        <div className="report-header-side">
          <div className="report-header-meta-grid">
            <div className="page-hero-meta-card">
              <span className="page-hero-meta-label">Area</span>
              <strong>{fieldArea}</strong>
            </div>
            <div className="page-hero-meta-card">
              <span className="page-hero-meta-label">Analysis date</span>
              <strong>{formatWorkspaceDateTime(activeReport.analysisDate, 'Current session')}</strong>
            </div>
            <div className="page-hero-meta-card report-risk-card">
              <span className="page-hero-meta-label">Risk status</span>
              <span className={`status-pill ${getRiskTone(activeReport.riskLevel)}`}>
                <ShieldAlert size={14} />
                {activeReport.riskLevel || 'Unknown'}
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
              Run New Analysis
            </button>
          </div>
        </div>
      </section>

      {notice ? <div className="workspace-notice-banner">{notice}</div> : null}

      <section className="report-main-layout">
        <div className="glass-panel report-map-panel">
          <div className="workspace-section-heading">
            <div className="workspace-section-icon">
              <MapPinned size={16} />
            </div>
            <div>
              <strong style={{ fontSize: '1rem' }}>Field map</strong>
              <p className="workspace-helper-text">
                The selected field boundary stays visible here so the screening result remains tied to the actual parcel.
              </p>
            </div>
          </div>

          <div className="workspace-map-stage report-map-stage">
            <FieldMap
              user={user}
              backendHealthy={backendHealthy}
              analysisStarted={analysisStarted}
              isAnalyzing={false}
              geoJsonData={analysisGeoJsonData}
              selectedField={selectedField}
              setSelectedField={setSelectedField}
              fieldLayerVisible={Boolean(analysisGeoJsonData) || fieldLayerVisible}
              analysisResults={analysisResults}
              fieldRiskLevel={activeReport.riskLevel}
              fieldName={selectedFieldName}
              hasStoredAnalysis
              readOnly
              showDemoData={false}
            />
          </div>
        </div>

        <aside className="glass-panel report-summary-panel">
          <div className="workspace-section-heading">
            <div className="workspace-section-icon">
              <FileText size={16} />
            </div>
            <div>
              <strong style={{ fontSize: '1rem' }}>Field summary</strong>
              <p className="workspace-helper-text">
                This is a screening result based on satellite indicators and model-assisted interpretation. Field inspection recommended before action.
              </p>
            </div>
          </div>

          <div className="workspace-note-card">
            <strong>{conditionSummary.value}</strong>
            <p className="workspace-helper-text">
              {activeReport.summary || 'The latest screening result combines vegetation indicators and land-cover classification to highlight where closer review may be needed.'}
            </p>
          </div>

          <div className="report-summary-list">
            <ResultsSummaryItem
              label="Field condition"
              value={conditionSummary.value}
              helper={conditionSummary.helper}
            />
            <ResultsSummaryItem
              label="Vegetation level"
              value={vegetationLevel.value}
              helper={vegetationLevel.helper}
            />
            <ResultsSummaryItem
              label="Risk level"
              value={activeReport.riskLevel || 'Unknown'}
              helper="Use this as a screening signal to prioritize field inspection."
            />
            <ResultsSummaryItem
              label="Land cover"
              value={activeReport.cropType}
              helper="Model-assisted land-cover label from the latest analysis run."
            />
            <ResultsSummaryItem
              label="Recommended action"
              value={recommendedAction}
              helper={`Updated ${formatWorkspaceDateTime(activeReport.analysisDate, 'Current session')}`}
            />
          </div>
        </aside>
      </section>

      <div className="report-detail-grid">
        <section className="workspace-panel-section glass-panel report-section-card">
          <div className="workspace-section-heading">
            <div className="workspace-section-icon">
              <ShieldAlert size={16} />
            </div>
            <div>
              <strong style={{ fontSize: '1rem' }}>Recommendations</strong>
              <p className="workspace-helper-text">
                These next steps translate the current screening result into plain language. Field inspection is recommended to confirm the situation on the ground.
              </p>
            </div>
          </div>

          <div className="workspace-recommendation-list">
            {activeReport.recommendations.map((item, index) => (
              <div key={`${item}-${index}`} className="workspace-recommendation-item">
                <span className="workspace-empty-step-number">{index + 1}</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="workspace-panel-section glass-panel report-section-card">
          <div className="workspace-section-heading">
            <div className="workspace-section-icon">
              <CalendarClock size={16} />
            </div>
            <div>
              <strong style={{ fontSize: '1rem' }}>Analysis history</strong>
              <p className="workspace-helper-text">
                Stored runs for this field. Open an earlier run to inspect that result context.
              </p>
            </div>
          </div>

          <MonitoringSeasonSelector
            value={selectedSeason}
            onChange={onChangeSeason}
            compact
          />

          {loadingHistory ? (
            <div className="empty-state compact">Loading field history...</div>
          ) : (
            <AnalysisHistoryList
              items={fieldHistory}
              selectedSeason={selectedSeason}
              emptyText={`No stored analyses for ${selectedFieldName} in Season ${selectedSeason}.`}
              onItemClick={(analysisItem) => onOpenAnalysis?.(analysisItem, analysisFieldContext)}
            />
          )}

          {visibleSeasonHistory.length ? (
            <div className="workspace-helper-text">
              {visibleSeasonHistory.length} stored run(s) in Season {selectedSeason}.
            </div>
          ) : null}
        </section>
      </div>

      <section className="workspace-panel-section glass-panel report-section-card">
        <div className="workspace-section-heading">
          <div className="workspace-section-icon">
            <BrainCircuit size={16} />
          </div>
          <div>
            <strong style={{ fontSize: '1rem' }}>Vegetation indicators</strong>
            <p className="workspace-helper-text">
              NDVI and EVI stay visible, but the main takeaway is translated into plain-language levels first. The raw values remain here as supporting details.
            </p>
          </div>
        </div>

        <div className="report-indicator-grid">
          <IndicatorLevelCard
            title="Greenness level"
            metricName="NDVI"
            rawValue={formatIndex(activeReport.ndviValue)}
            level={ndviLevel.value}
            tone={ndviLevel.tone}
            helper={ndviLevel.helper}
            explanation="NDVI is the greenness signal. Farmers can read this as how strongly the field is reflecting healthy green vegetation right now."
            icon={<Activity />}
            accentColor="var(--status-healthy)"
          />
          <IndicatorLevelCard
            title="Vegetation strength"
            metricName="EVI"
            rawValue={formatIndex(activeReport.eviValue)}
            level={eviLevel.value}
            tone={eviLevel.tone}
            helper={eviLevel.helper}
            explanation="EVI is a support signal for plant vigor. It helps cross-check vegetation strength when soil brightness or background conditions affect the image."
            icon={<Sprout />}
            accentColor="var(--accent-color)"
          />
        </div>

        <div className="report-technical-grid">
          <FieldMetricCard
            label="Screening confidence"
            value={activeReport.confidenceLabel}
            helper="Model confidence for the current land-cover screening result."
            icon={<BrainCircuit />}
            accentColor="#a855f7"
          />
          <FieldMetricCard
            label="Technical detail"
            value="ResNet50-assisted screening"
            helper="Technical classification detail for results review; not a disease or yield diagnosis."
            icon={<FileText />}
            accentColor="var(--status-warning)"
          />
        </div>
      </section>
    </div>
  );
}
