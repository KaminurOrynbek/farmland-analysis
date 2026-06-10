import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BrainCircuit,
  CalendarClock,
  Download,
  Info,
  Layers3,
  Leaf,
  MapPinned,
  ShieldCheck
} from 'lucide-react';
import { fetchAnalysisHistory } from '../api/client';
import FieldMap from '../components/workspace/FieldMap';
import NoAnalysisState from '../components/workspace/NoAnalysisState';
import MonitoringSeasonSelector from '../components/workspace/MonitoringSeasonSelector';
import { APP_PAGES } from '../constants/appPages';
import { formatAreaMeasure, formatIndex } from '../utils/analysisFormatters';
import FieldCommentsPanel from '../components/workspace/FieldCommentsPanel';
import { downloadAnalysisReportPdf } from '../utils/reportPdf';
import {
  ANALYSIS_LIMITATION_NOTE,
  buildSeasonOptions,
  createFieldFallbackRecord,
  filterAnalysesBySeason,
  formatWorkspaceDate,
  formatWorkspaceDateTime,
  getCurrentSeasonYear,
  getFieldSelectionId,
  getFieldSelectionName,
  getVegetationIndexLevelDisplay,
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

const hasMeaningfulAnalysis = (analysis) => (
  Boolean(
    analysis?.analysisId ||
    analysis?.predictedClass ||
    analysis?.riskLevel ||
    analysis?.ndviValue !== null && analysis?.ndviValue !== undefined ||
    analysis?.eviValue !== null && analysis?.eviValue !== undefined
  )
);

const getInspectionPrioritySummary = ({
  riskLevel,
  selectedSeason,
  fallbackSeason
}) => {
  if (riskLevel === 'Low') {
    return {
      tone: 'healthy',
      priorityLabel: 'Low inspection priority',
      headline: 'The field looks stable',
      reason: 'The latest satellite image shows steady vegetation signals for this field.',
      badge: 'Continue routine monitoring'
    };
  }

  if (riskLevel === 'Medium') {
    return {
      tone: 'warning',
      priorityLabel: 'Medium inspection priority',
      headline: 'Check the field when convenient',
      reason: 'The latest satellite image shows mixed vegetation signals that are worth checking on your next visit.',
      badge: 'Check during next field visit'
    };
  }

  if (riskLevel === 'High') {
    return {
      tone: 'critical',
      priorityLabel: 'High inspection priority',
      headline: 'Inspect this field soon',
      reason: 'The latest satellite image shows weaker vegetation signals than expected for this field.',
      badge: 'Inspect soon'
    };
  }

  if (riskLevel === 'Critical') {
    return {
      tone: 'critical',
      priorityLabel: 'Critical inspection priority',
      headline: 'Inspect this field urgently',
      reason: 'The latest satellite image shows very weak or unusual vegetation signals that need urgent attention.',
      badge: 'Inspect urgently'
    };
  }

  const seasonMessage =
    fallbackSeason && String(fallbackSeason) !== String(selectedSeason)
      ? `No stored analysis is available for Season ${selectedSeason}. The map keeps the latest available context from Season ${fallbackSeason}.`
      : `No stored analysis is available for Season ${selectedSeason}.`;

  return {
    tone: 'neutral',
    priorityLabel: 'Not analyzed',
    headline: 'No analysis available for this period',
    reason: seasonMessage,
    badge: 'No result for selected period'
  };
};

function TechnicalDetail({ label, value, helper }) {
  return (
    <div className="analysis-results-technical-item">
      <span>{label}</span>
      <strong>{value}</strong>
      {helper ? <p>{helper}</p> : null}
    </div>
  );
}

function ResultHighlightCard({
  icon,
  label,
  value,
  helper,
  tone = 'neutral',
  badge = null
}) {
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

const waitForDomImage = (image) => new Promise((resolve) => {
  if (!image || image.complete) {
    resolve();
    return;
  }

  const handleDone = () => {
    image.removeEventListener('load', handleDone);
    image.removeEventListener('error', handleDone);
    resolve();
  };

  image.addEventListener('load', handleDone, { once: true });
  image.addEventListener('error', handleDone, { once: true });
});

const loadSerializableImage = (src) => new Promise((resolve, reject) => {
  const image = new Image();

  image.crossOrigin = 'anonymous';
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Map overlay could not be loaded.'));
  image.src = src;
});

const captureMapImageFromStage = async (stageElement) => {
  const leafletElement = stageElement?.querySelector('.leaflet-container');

  if (!leafletElement) {
    return null;
  }

  const bounds = leafletElement.getBoundingClientRect();
  const width = Math.round(bounds.width);
  const height = Math.round(bounds.height);

  if (!width || !height) {
    return null;
  }

  const imageElements = Array.from(
    leafletElement.querySelectorAll('img.leaflet-tile, img.leaflet-image-layer')
  );

  await Promise.all(imageElements.map(waitForDomImage));

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement('canvas');
  canvas.width = width * pixelRatio;
  canvas.height = height * pixelRatio;

  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  context.scale(pixelRatio, pixelRatio);
  context.fillStyle = '#0b1726';
  context.fillRect(0, 0, width, height);

  imageElements.forEach((image) => {
    const imageBounds = image.getBoundingClientRect();

    if (!imageBounds.width || !imageBounds.height) {
      return;
    }

    const computedStyle = window.getComputedStyle(image);

    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
      return;
    }

    const opacity = Number.parseFloat(computedStyle.opacity || '1');
    context.globalAlpha = Number.isFinite(opacity) ? opacity : 1;

    try {
      context.drawImage(
        image,
        imageBounds.left - bounds.left,
        imageBounds.top - bounds.top,
        imageBounds.width,
        imageBounds.height
      );
    } catch {
      // Some browsers block remote-tile drawing; the PDF export falls back to SVG in that case.
    }
  });

  context.globalAlpha = 1;

  const overlaySvg = leafletElement.querySelector('.leaflet-overlay-pane svg');

  if (overlaySvg) {
    const svgBounds = overlaySvg.getBoundingClientRect();

    if (svgBounds.width && svgBounds.height) {
      const clonedSvg = overlaySvg.cloneNode(true);
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clonedSvg.setAttribute('width', `${svgBounds.width}`);
      clonedSvg.setAttribute('height', `${svgBounds.height}`);

      if (!clonedSvg.getAttribute('viewBox')) {
        clonedSvg.setAttribute('viewBox', `0 0 ${svgBounds.width} ${svgBounds.height}`);
      }

      try {
        const serializedSvg = new XMLSerializer().serializeToString(clonedSvg);
        const svgImage = await loadSerializableImage(
          `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serializedSvg)}`
        );

        context.drawImage(
          svgImage,
          svgBounds.left - bounds.left,
          svgBounds.top - bounds.top,
          svgBounds.width,
          svgBounds.height
        );
      } catch {
        // Keep the tile capture if the SVG overlay cannot be serialized.
      }
    }
  }

  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
};

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
  refreshKey
}) {
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [notice, setNotice] = useState('');
  const [isPreparingPdf, setIsPreparingPdf] = useState(false);
  const mapStageRef = useRef(null);
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

  const seasonOptions = useMemo(
    () => buildSeasonOptions(fieldHistory, false, selectedSeasonLabel),
    [fieldHistory, selectedSeasonLabel]
  );

  const seasonHistory = useMemo(
    () => filterAnalysesBySeason(fieldHistory, selectedSeasonLabel),
    [fieldHistory, selectedSeasonLabel]
  );

  const latestSeasonAnalysis = seasonHistory[0] || null;
  const currentSessionAnalysis = useMemo(() => (
    analysisStarted
      ? normalizeAnalysisRecord({
          ...analysisResults,
          analysisDate: latestAnalysisAt || analysisResults.analysisDate
        })
      : null
  ), [analysisResults, analysisStarted, latestAnalysisAt]);
  const latestAvailableReport = hasMeaningfulAnalysis(currentSessionAnalysis)
    ? currentSessionAnalysis
    : fieldHistory.find((item) => hasMeaningfulAnalysis(item)) || null;

  const selectedSeasonReport =
    hasMeaningfulAnalysis(currentSessionAnalysis) &&
    String(currentSessionAnalysis?.seasonYear) === selectedSeasonLabel
      ? currentSessionAnalysis
      : latestSeasonAnalysis;

  const activeReport = selectedSeasonReport;
  const contextReport = activeReport || latestAvailableReport;
  const displayFieldName =
    selectedFieldName !== 'Unnamed Field'
      ? selectedFieldName
      : contextReport?.fieldName || selectedFieldName;
  const previousSeasonRuns = useMemo(() => {
    if (!activeReport) {
      return [];
    }

    if (
      activeReport.analysisId &&
      seasonHistory[0]?.analysisId &&
      String(activeReport.analysisId) === String(seasonHistory[0].analysisId)
    ) {
      return seasonHistory.slice(1);
    }

    return seasonHistory;
  }, [activeReport, seasonHistory]);
  const showingLatestContextFallback = !activeReport && Boolean(contextReport);

  const inspectionSummary = getInspectionPrioritySummary({
    riskLevel: activeReport?.riskLevel,
    selectedSeason: selectedSeasonLabel,
    fallbackSeason: contextReport?.seasonYear
  });
  const ndviDisplay = getVegetationIndexLevelDisplay('ndvi', activeReport?.ndviValue);
  const eviDisplay = getVegetationIndexLevelDisplay('evi', activeReport?.eviValue);
  const confidenceTone = useMemo(() => {
    const numeric = Number(activeReport?.confidence);

    if (!Number.isFinite(numeric)) {
      return 'neutral';
    }

    const percentage = numeric <= 1 ? numeric * 100 : numeric;

    if (percentage >= 75) {
      return 'healthy';
    }

    if (percentage >= 55) {
      return 'warning';
    }

    return 'critical';
  }, [activeReport?.confidence]);

  const analysisGeoJsonData = useMemo(() => (
    geoJsonData?.features?.length
      ? geoJsonData
      : buildGeoJsonFromSelection(selectedField, selectedFieldId, selectedFieldName)
  ), [geoJsonData, selectedField, selectedFieldId, selectedFieldName]);

  const fieldArea = fieldRecord?.area_ha
    ? formatAreaMeasure(fieldRecord.area_ha)
    : contextReport?.areaHectares
      ? formatAreaMeasure(contextReport.areaHectares)
      : 'Area pending';

  const latestRunLabel = contextReport?.analysisDate
    ? formatWorkspaceDateTime(contextReport.analysisDate, 'Not available')
    : 'Not available';

  const satelliteDateLabel = contextReport?.satelliteAcquisitionDate
    ? formatWorkspaceDate(contextReport.satelliteAcquisitionDate)
    : contextReport?.startDate && contextReport?.endDate
      ? `${formatWorkspaceDate(contextReport.startDate)} to ${formatWorkspaceDate(contextReport.endDate)}`
      : 'Not available';

  const previousRunsMessage = useMemo(() => {
    if (loadingHistory) {
      return 'Loading previous runs...';
    }

    if (!activeReport) {
      return `No stored runs are available for Season ${selectedSeasonLabel}.`;
    }

    if (!previousSeasonRuns.length) {
      return `No previous runs are stored for Season ${selectedSeasonLabel}.`;
    }

    return `${previousSeasonRuns.length} previous run${previousSeasonRuns.length === 1 ? '' : 's'} stored for Season ${selectedSeasonLabel}.`;
  }, [activeReport, loadingHistory, previousSeasonRuns.length, selectedSeasonLabel]);
  const reportToDownload = activeReport || contextReport || null;
  const technicalDetails = useMemo(() => {
    if (!activeReport) {
      return [];
    }

    return [
      {
        label: 'Model workflow',
        value: 'ResNet-50-assisted',
        helper: 'Classification support used for the land-cover result.'
      },
      activeReport?.satelliteSource
        ? {
            label: 'Satellite source',
            value: activeReport.satelliteSource
          }
        : null,
      activeReport?.cloudCoverage !== null && activeReport?.cloudCoverage !== undefined
        ? {
            label: 'Cloud coverage',
            value: `${activeReport.cloudCoverage}%`
          }
        : null,
      activeReport?.qualityFlags?.length
        ? {
            label: 'Quality flags',
            value: activeReport.qualityFlags.join(', '),
            helper: 'Processing flags returned with this run.'
          }
        : null
    ].filter(Boolean);
  }, [activeReport]);

  const handleSeasonChange = (nextSeason) => {
    const normalizedSeason = typeof nextSeason === 'object' && nextSeason !== null
      ? String(nextSeason.seasonYear || getCurrentSeasonYear())
      : String(nextSeason || getCurrentSeasonYear());

    onChangeSeason?.(normalizedSeason);
  };

  const handleDownloadPdf = async () => {
    if (!reportToDownload) {
      return;
    }

    const reportWindow = window.open('', '_blank', 'width=1080,height=820');

    if (!reportWindow) {
      alert('Allow pop-ups in your browser to download the PDF report.');
      return;
    }

    setIsPreparingPdf(true);

    try {
      await new Promise((resolve) => {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(resolve);
        });
      });

      const mapImageDataUrl = await captureMapImageFromStage(mapStageRef.current);
      const opened = downloadAnalysisReportPdf({
        fieldName: displayFieldName,
        fieldAreaHectares: fieldRecord?.area_ha || reportToDownload?.areaHectares || null,
        analysisPeriodLabel: `Season ${selectedSeasonLabel}`,
        report: reportToDownload,
        recommendation: inspectionSummary.reason,
        recommendationHeadline: inspectionSummary.headline,
        historyItems: fieldHistory,
        geoJsonData: analysisGeoJsonData,
        mapImageDataUrl,
        reportWindow,
        contextNotice: showingLatestContextFallback
          ? `No result is stored for Season ${selectedSeasonLabel}. This export uses the latest available analysis from Season ${contextReport?.seasonYear}.`
          : ''
      });

      if (!opened) {
        alert('Allow pop-ups in your browser to download the PDF report.');
      }
    } finally {
      setIsPreparingPdf(false);
    }
  };

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
          <div className="page-kicker">Land health report</div>
          <h1 className="page-title">{displayFieldName}</h1>
          <p className="page-subtitle">Satellite-based summary for the selected parcel.</p>

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

        <div className="analysis-results-hero-side">
          <div className="page-hero-actions">
            <button
              type="button"
              className="secondary-btn"
              onClick={handleDownloadPdf}
              disabled={!reportToDownload || isPreparingPdf}
            >
              <Download size={16} />
              {isPreparingPdf ? 'Preparing PDF...' : 'Download PDF'}
            </button>

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

          <div className={`analysis-results-priority-card tone-${inspectionSummary.tone}`}>
            <div className="analysis-results-priority-head">
              <span className="analysis-results-card-kicker">Inspection priority</span>
              <span className={`status-pill ${inspectionSummary.tone}`}>
                {inspectionSummary.priorityLabel}
              </span>
            </div>

            <h2>{inspectionSummary.headline}</h2>
            <p>{inspectionSummary.reason}</p>
          </div>
        </div>
      </section>

      {notice ? <div className="workspace-notice-banner">{notice}</div> : null}

      <section className="analysis-results-main-grid">
        <div className="analysis-results-map-panel glass-panel">
          <div className="workspace-section-heading">
            <div className="workspace-section-icon">
              <MapPinned size={16} />
            </div>
            <div>
              <strong style={{ fontSize: '1rem' }}>Field map</strong>
              <p className="workspace-helper-text">
                Boundary colored by the latest available inspection priority.
              </p>
            </div>
          </div>

          <div className="workspace-map-stage analysis-results-map-stage" ref={mapStageRef}>
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

        <div className="analysis-results-side-stack">
          <aside className="analysis-results-context-panel glass-panel">
            <div className="workspace-section-heading">
              <div className="workspace-section-icon">
                <CalendarClock size={16} />
              </div>
              <div>
                <strong style={{ fontSize: '1rem' }}>Analysis context</strong>
                <p className="workspace-helper-text">
                  Review the selected season and the stored run details.
                </p>
              </div>
            </div>

            <div className="analysis-results-season-switcher">
              <span className="analysis-results-inline-label">Season</span>
              <MonitoringSeasonSelector
                value={selectedSeasonLabel}
                onChange={handleSeasonChange}
                options={seasonOptions}
                compact
                label=""
              />
            </div>

            {showingLatestContextFallback ? (
              <div className="analysis-results-context-banner">
                {`No result for Season ${selectedSeasonLabel}. Context below is from the latest available run in Season ${contextReport?.seasonYear}.`}
              </div>
            ) : null}

            <div className="analysis-results-context-list">
              <div className="analysis-results-context-row">
                <span>Satellite image date</span>
                <strong>{satelliteDateLabel}</strong>
              </div>

              <div className="analysis-results-context-row">
                <span>Land-cover class</span>
                <strong>{contextReport?.predictedClass || 'Not available'}</strong>
              </div>

              <div className="analysis-results-context-row">
                <span>Confidence</span>
                <strong>{contextReport?.confidenceLabel || '—'}</strong>
              </div>
            </div>

            <div className="analysis-results-context-banner">{previousRunsMessage}</div>
          </aside>

          <section className={`analysis-results-action-card glass-panel tone-${inspectionSummary.tone}`}>
            <div className="analysis-results-action-copy">
              <span className="analysis-results-card-kicker">Recommended action</span>
              <h2>{inspectionSummary.headline}</h2>
              <p>{inspectionSummary.reason}</p>
              <span className={`analysis-results-action-badge ${inspectionSummary.tone}`}>
                {inspectionSummary.badge}
              </span>
            </div>

            <div className="analysis-results-note">
              <Info size={16} />
              <span>{ANALYSIS_LIMITATION_NOTE}</span>
            </div>
          </section>
        </div>
      </section>

      <section className="analysis-results-highlights">
        <ResultHighlightCard
          icon={<Leaf size={16} />}
          label="NDVI"
          value={formatIndex(activeReport?.ndviValue)}
          helper={ndviDisplay.helper}
          tone={ndviDisplay.tone}
          badge={ndviDisplay.value}
        />
        <ResultHighlightCard
          icon={<Activity size={16} />}
          label="EVI"
          value={formatIndex(activeReport?.eviValue)}
          helper={eviDisplay.helper}
          tone={eviDisplay.tone}
          badge={eviDisplay.value}
        />
        <ResultHighlightCard
          icon={<Layers3 size={16} />}
          label="Land-cover class"
          value={contextReport?.predictedClass || 'Not available'}
          helper="Latest model-assisted class estimate for the selected run."
          tone="neutral"
        />
        <ResultHighlightCard
          icon={<ShieldCheck size={16} />}
          label="Confidence"
          value={contextReport?.confidenceLabel || '—'}
          helper="Model confidence for the selected land-cover classification."
          tone={confidenceTone}
        />
      </section>

      <section className="analysis-results-technical glass-panel">
        <div className="workspace-section-heading">
          <div className="workspace-section-icon">
            <BrainCircuit size={16} />
          </div>
          <div>
            <strong style={{ fontSize: '1rem' }}>Run details</strong>
            <p className="workspace-helper-text">
              Supporting metadata from the selected analysis run.
            </p>
          </div>
        </div>

        {technicalDetails.length ? (
          <div className="analysis-results-technical-grid">
            {technicalDetails.map((item) => (
              <TechnicalDetail
                key={item.label}
                label={item.label}
                value={item.value}
                helper={item.helper}
              />
            ))}
          </div>
        ) : (
          <div className="analysis-results-empty-card">
            No additional run metadata is available for Season {selectedSeasonLabel}.
          </div>
        )}
      </section>


      <section className="analysis-results-comments glass-panel">
        <FieldCommentsPanel
          user={user}
          fieldId={selectedFieldId}
          selectedField={fieldRecord || selectedField}
          hasGeometry={Boolean(analysisGeoJsonData)}
          variant="embedded"
          collapsible
          expanded={commentsExpanded}
          onToggleExpanded={() => setCommentsExpanded((current) => !current)}
        />
      </section>
    </div>
  );
}
