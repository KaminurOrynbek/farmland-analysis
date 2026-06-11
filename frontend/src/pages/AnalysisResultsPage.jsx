import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  BrainCircuit,
  Download,
  Layers3,
  Leaf,
  MapPinned,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';
import { fetchAnalysisHistory } from '../api/client';
import FieldMap from '../components/workspace/FieldMap';
import NoAnalysisState from '../components/workspace/NoAnalysisState';
import { APP_PAGES } from '../constants/appPages';
import { formatAreaMeasure, formatIndex } from '../utils/analysisFormatters';
import FieldCommentsPanel from '../components/workspace/FieldCommentsPanel';
import { downloadAnalysisReportPdf } from '../utils/reportPdf';

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
import { getRiskLabel, t } from '../i18n.js';

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
      label: t('Healthy'),
      title: t('The field looks stable'),
      text: t('NDVI and EVI indicate good vegetation condition for the selected season.')
    };
  }

  if (riskLevel === 'Medium') {
    return {
      tone: 'warning',
      label: t('Moderate'),
      title: t('The field needs attention'),
      text: t('Vegetation indicators show mixed field condition. Review the map and monitor this parcel.')
    };
  }

  if (riskLevel === 'High' || riskLevel === 'Critical') {
    return {
      tone: 'critical',
      label: t('Needs attention'),
      title: t('The field may be stressed'),
      text: t('NDVI and EVI show weak vegetation signals. This parcel should be checked.')
    };
  }

  return {
    tone: 'neutral',
    label: t('Not analyzed'),
    title: t('No health result available'),
    text: t('Run an analysis to calculate NDVI, EVI, and field health status.')
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

  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);

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
            ? t('Field history could not be refreshed. Showing the latest available result.')
            : t('Backend is not connected. Stored analysis history is unavailable right now.')
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
      : t('Area pending');

  const latestRunLabel = contextReport?.analysisDate
    ? formatWorkspaceDateTime(contextReport.analysisDate, t('Not available'))
    : loadingHistory
      ? t('Loading...')
      : t('Not available');

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


  const reportToDownload = activeReport || contextReport || null;

  const handleDownloadPdf = async () => {
    if (!reportToDownload) return;

    const reportWindow = window.open('', '_blank', 'width=1080,height=820');

    if (!reportWindow) {
      alert(t('Allow pop-ups in your browser to download the PDF report.'));
      return;
    }

    setIsPreparingPdf(true);

    try {
      const opened = downloadAnalysisReportPdf({
        fieldName: displayFieldName,
        fieldAreaHectares: fieldRecord?.area_ha || reportToDownload?.areaHectares || null,
        analysisPeriodLabel: `${t('Season')} ${selectedSeasonLabel}`,
        report: reportToDownload,
        recommendation: healthSummary.text,
        recommendationHeadline: healthSummary.title,
        historyItems: fieldHistory,
        geoJsonData: analysisGeoJsonData,
        reportWindow
      });

      if (!opened) {
        alert(t('Allow pop-ups in your browser to download the PDF report.'));
      }
    } finally {
      setIsPreparingPdf(false);
    }
  };

  if (!selectedField && !activeReport) {
    return (
      <div className="content-page">
        <NoAnalysisState
          title={t('No analysis available yet')}
          description={t('Select or save a field in Workspace, then run an analysis to open the land health report.')}
          primaryAction={{
            label: t('Open {page}', { page: t(APP_PAGES.WORKSPACE) }),
            onClick: () => onNavigate(APP_PAGES.WORKSPACE)
          }}
          secondaryAction={{
            label: t('Open {page}', { page: t(APP_PAGES.FIELDS) }),
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
          <div className="page-kicker">{t('Field health report')}</div>
          <h1 className="page-title">{displayFieldName}</h1>
          <p className="page-subtitle">
            {t('Satellite-based result for the selected parcel and season.')}
          </p>

          <div className="analysis-results-meta-strip">
            <div className="analysis-results-meta-pill">
              <span>{t('Season')}</span>
              <strong>{selectedSeasonLabel}</strong>
            </div>

            <div className="analysis-results-meta-pill">
              <span>{t('Area')}</span>
              <strong>{fieldArea}</strong>
            </div>

            <div className="analysis-results-meta-pill">
              <span>{t('Latest run')}</span>
              <strong>{latestRunLabel}</strong>
            </div>
          </div>


          <div className="page-hero-actions analysis-results-top-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={handleDownloadPdf}
              disabled={!reportToDownload || isPreparingPdf}
            >
              <Download size={16} />
              {isPreparingPdf ? t('Preparing PDF...') : t('Download PDF')}
            </button>

            <button
              type="button"
              className="secondary-btn"
              onClick={() => setCommentsExpanded((current) => !current)}
            >
              <MessageSquare size={16} />
              {commentsExpanded ? t('Hide comments') : t('Show comments')}
            </button>
          </div>  

        </div>

        <div className={`analysis-results-health-card tone-${healthSummary.tone}`}>
          <span className="analysis-results-card-kicker">{t('Field health status')}</span>
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

      {commentsExpanded ? (
        <section className="analysis-results-comments glass-panel">
          <FieldCommentsPanel
            user={user}
            fieldId={selectedFieldId}
            selectedField={fieldRecord || selectedField}
            hasGeometry={Boolean(analysisGeoJsonData)}
            variant="embedded"
            collapsible={false}
          />
        </section>
      ) : null}

      <section className="analysis-results-main-grid clean">
        <div className="analysis-results-map-panel glass-panel">
          <div className="workspace-section-heading">
            <div className="workspace-section-icon">
              <MapPinned size={16} />
            </div>
            <div>
              <strong style={{ fontSize: '1rem' }}>{t('NDVI vegetation map')}</strong>
              <p className="workspace-helper-text">
                {t('Visual layer based on NDVI values. EVI is included as a separate measurement.')}
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
                <strong style={{ fontSize: '1rem' }}>{t('Vegetation measurements')}</strong>
                <p className="workspace-helper-text">
                  {t('NDVI and EVI are used together to calculate the final field health status.')}
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
                label={t('Risk level')}
                value={getRiskLabel(activeReport?.riskLevel) || t('Not available')}
                helper={t('Calculated from NDVI, EVI, and stressed vegetation area.')}
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
              {t('Open Workspace')}
            </button>

            <button
              type="button"
              className="primary-btn"
              onClick={() => onRunNewAnalysis?.()}
            >
              {t('Run new analysis')}
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
            <strong style={{ fontSize: '1rem' }}>{t('Satellite image classification')}</strong>
            <p className="workspace-helper-text">
              {t('Additional machine-learning context for the analyzed satellite image.')}
            </p>
          </div>
        </div>

        <div className="analysis-results-classification-grid">
          <ResultMetricCard
            icon={<Layers3 size={16} />}
            label={t('Detected land-cover type')}
            value={contextReport?.predictedClass || t('Not available')}
            helper={t('Dominant land-cover category detected by the ResNet-50 model.')}
            tone="neutral"
          />

          <ResultMetricCard
            icon={<ShieldCheck size={16} />}
            label={t('Model certainty')}
            value={contextReport?.confidenceLabel || '—'}
            helper={t('How certain the model is about this detected land-cover type.')}
            tone={confidenceTone}
          />
        </div>
      </section>
    </div>
  );
}
