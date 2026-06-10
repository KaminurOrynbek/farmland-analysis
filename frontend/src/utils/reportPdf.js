import { formatAreaMeasure, formatIndex } from './analysisFormatters';
import { computeBboxFromGeoJson } from './geoUtils';
import {
  ANALYSIS_LIMITATION_NOTE,
  formatWorkspaceDate,
  formatWorkspaceDateTime,
  normalizeConfidence
} from './fieldAnalysisUtils';

const EMPTY_FORMATTED_VALUE = formatIndex(null);
const MAP_WIDTH = 820;
const MAP_HEIGHT = 380;
const MAP_PADDING = 28;

const RISK_COLORS = {
  Low: '#22c55e',
  Medium: '#eab308',
  High: '#ef4444',
  Critical: '#ef4444'
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const toDisplayValue = (value, fallback = 'Not available') => (
  value === null || value === undefined || value === '' || value === EMPTY_FORMATTED_VALUE
    ? fallback
    : String(value)
);

const getPriorityLabel = (riskLevel) => {
  if (riskLevel === 'Low') {
    return 'Low priority';
  }

  if (riskLevel === 'Medium') {
    return 'Medium priority';
  }

  if (riskLevel === 'High' || riskLevel === 'Critical') {
    return 'High priority';
  }

  return 'Not analyzed';
};

const getRiskColor = (riskLevel) => RISK_COLORS[riskLevel] || '#64748b';

const getAreaLabel = (fieldAreaHectares, report) => {
  if (
    fieldAreaHectares !== null &&
    fieldAreaHectares !== undefined &&
    !Number.isNaN(Number(fieldAreaHectares))
  ) {
    return formatAreaMeasure(fieldAreaHectares);
  }

  if (
    report?.areaHectares !== null &&
    report?.areaHectares !== undefined &&
    !Number.isNaN(Number(report.areaHectares))
  ) {
    return formatAreaMeasure(report.areaHectares);
  }

  return 'Not available';
};

const getSatelliteDateLabel = (report) => {
  if (report?.satelliteAcquisitionDate) {
    return formatWorkspaceDate(report.satelliteAcquisitionDate, 'Not available');
  }

  if (report?.startDate && report?.endDate) {
    return `${formatWorkspaceDate(report.startDate, 'Not available')} to ${formatWorkspaceDate(report.endDate, 'Not available')}`;
  }

  return 'Not available';
};

const buildHistoryEntries = (historyItems = []) => (
  historyItems
    .filter(Boolean)
    .slice(0, 5)
    .map((item) => ({
      title: formatWorkspaceDateTime(
        item?.analysisDate || item?.analysis_date || item?.analysisCreatedAt,
        'Pending date'
      ),
      summary: [
        item?.predictedClass || item?.predicted_class || 'Result pending',
        item?.riskLevel || item?.risk_level || item?.status || 'Recorded'
      ].join(' | ')
    }))
);

const normalizeMapData = (input) => {
  if (!input) {
    return null;
  }

  if (input.type === 'FeatureCollection') {
    return input;
  }

  if (input.type === 'Feature') {
    return {
      type: 'FeatureCollection',
      features: [input]
    };
  }

  if (input.type && input.coordinates) {
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {},
          geometry: input
        }
      ]
    };
  }

  return null;
};

const collectPolygonRings = (geometry, polygons) => {
  if (!geometry?.type) {
    return;
  }

  if (geometry.type === 'Polygon' && Array.isArray(geometry.coordinates)) {
    polygons.push(geometry.coordinates);
    return;
  }

  if (geometry.type === 'MultiPolygon' && Array.isArray(geometry.coordinates)) {
    geometry.coordinates.forEach((polygon) => {
      if (Array.isArray(polygon)) {
        polygons.push(polygon);
      }
    });
    return;
  }

  if (geometry.type === 'GeometryCollection' && Array.isArray(geometry.geometries)) {
    geometry.geometries.forEach((child) => collectPolygonRings(child, polygons));
  }
};

const buildSvgMapMarkup = (mapData, fieldName, riskLevel) => {
  const featureCollection = normalizeMapData(mapData);
  const bbox = computeBboxFromGeoJson(featureCollection);

  if (!featureCollection?.features?.length || !bbox) {
    return `
      <div class="map-empty">
        <strong>${escapeHtml(fieldName)}</strong>
        <span>Map preview is not available for this field.</span>
      </div>
    `;
  }

  const polygons = [];
  featureCollection.features.forEach((feature) => collectPolygonRings(feature?.geometry, polygons));

  if (!polygons.length) {
    return `
      <div class="map-empty">
        <strong>${escapeHtml(fieldName)}</strong>
        <span>Map preview is not available for this field.</span>
      </div>
    `;
  }

  let [minLng, minLat, maxLng, maxLat] = bbox;
  if (minLng === maxLng) {
    minLng -= 0.0005;
    maxLng += 0.0005;
  }
  if (minLat === maxLat) {
    minLat -= 0.0005;
    maxLat += 0.0005;
  }

  const rangeLng = maxLng - minLng;
  const rangeLat = maxLat - minLat;
  const drawableWidth = MAP_WIDTH - MAP_PADDING * 2;
  const drawableHeight = MAP_HEIGHT - MAP_PADDING * 2;
  const scale = Math.min(drawableWidth / rangeLng, drawableHeight / rangeLat);
  const offsetX = (MAP_WIDTH - rangeLng * scale) / 2;
  const offsetY = (MAP_HEIGHT - rangeLat * scale) / 2;
  const project = ([lng, lat]) => {
    const x = offsetX + (lng - minLng) * scale;
    const y = offsetY + (maxLat - lat) * scale;
    return `${x.toFixed(2)} ${y.toFixed(2)}`;
  };
  const pathMarkup = polygons
    .map((polygon) => {
      const pathData = polygon
        .map((ring) => {
          if (!Array.isArray(ring) || ring.length < 3) {
            return '';
          }

          const [first, ...rest] = ring;
          return `M ${project(first)} ${rest.map((pair) => `L ${project(pair)}`).join(' ')} Z`;
        })
        .filter(Boolean)
        .join(' ');

      return pathData
        ? `<path d="${pathData}" fill="${getRiskColor(riskLevel)}" fill-opacity="0.36" fill-rule="evenodd" clip-rule="evenodd" stroke="${getRiskColor(riskLevel)}" stroke-width="3" vector-effect="non-scaling-stroke" />`
        : '';
    })
    .join('');
  const priorityLabel = getPriorityLabel(riskLevel);

  return `
    <div class="map-card">
      <div class="map-card-head">
        <div>
          <strong>${escapeHtml(fieldName)}</strong>
          <span>Field boundary preview for the exported analysis result.</span>
        </div>
        <span class="map-priority" style="color:${escapeHtml(getRiskColor(riskLevel))}">${escapeHtml(priorityLabel)}</span>
      </div>

      <svg class="map-svg" viewBox="0 0 ${MAP_WIDTH} ${MAP_HEIGHT}" role="img" aria-label="${escapeHtml(fieldName)} map preview">
        <defs>
          <linearGradient id="map-bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#eff6ff" />
            <stop offset="52%" stop-color="#ecfeff" />
            <stop offset="100%" stop-color="#f0fdf4" />
          </linearGradient>
          <pattern id="map-grid" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" fill="none" stroke="rgba(148,163,184,0.26)" stroke-width="1" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="${MAP_WIDTH}" height="${MAP_HEIGHT}" rx="22" fill="url(#map-bg)" />
        <rect x="${MAP_PADDING}" y="${MAP_PADDING}" width="${MAP_WIDTH - MAP_PADDING * 2}" height="${MAP_HEIGHT - MAP_PADDING * 2}" rx="18" fill="url(#map-grid)" />
        ${pathMarkup}
      </svg>
    </div>
  `;
};

const buildCapturedMapMarkup = (mapImageDataUrl, fieldName, riskLevel) => {
  const priorityLabel = getPriorityLabel(riskLevel);

  return `
    <div class="map-card">
      <div class="map-card-head">
        <div>
          <strong>${escapeHtml(fieldName)}</strong>
          <span>Captured map view from the analysis results page.</span>
        </div>
        <span class="map-priority" style="color:${escapeHtml(getRiskColor(riskLevel))}">${escapeHtml(priorityLabel)}</span>
      </div>

      <img class="map-image" src="${escapeHtml(mapImageDataUrl)}" alt="${escapeHtml(fieldName)} captured map view" />
    </div>
  `;
};

const buildDetailRowsMarkup = (rows) => rows
  .filter(([, value]) => value !== null && value !== undefined && value !== '')
  .map(([label, value]) => (
    `<div class="detail-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(toDisplayValue(value))}</strong></div>`
  ))
  .join('');

export const downloadAnalysisReportPdf = ({
  fieldName,
  fieldAreaHectares = null,
  analysisPeriodLabel = 'Not available',
  report,
  recommendation = 'Not available',
  recommendationHeadline = 'Recommended action',
  historyItems = [],
  geoJsonData = null,
  mapImageDataUrl = '',
  reportWindow: providedReportWindow = null,
  contextNotice = ''
}) => {
  if (typeof window === 'undefined' || !report) {
    return false;
  }

  const reportWindow = providedReportWindow || window.open('', '_blank', 'width=1080,height=820');

  if (!reportWindow) {
    return false;
  }

  const displayFieldName = toDisplayValue(fieldName || report?.fieldName, 'Selected field');
  const areaLabel = getAreaLabel(fieldAreaHectares, report);
  const latestRunLabel = formatWorkspaceDateTime(
    report?.analysisDate || report?.analysisCreatedAt,
    'Not available'
  );
  const satelliteDateLabel = getSatelliteDateLabel(report);
  const confidenceLabel = toDisplayValue(
    report?.confidenceLabel || normalizeConfidence(report?.confidence, 'Not available'),
    'Not available'
  );
  const inspectionPriority = getPriorityLabel(report?.riskLevel);
  const historyEntries = buildHistoryEntries(historyItems);
  const summaryRows = [
    ['Field name', displayFieldName],
    ['Area', areaLabel],
    ['Analysis period', toDisplayValue(analysisPeriodLabel)],
    ['Latest run date', latestRunLabel]
  ];
  const contextRows = [
    ['Inspection priority', inspectionPriority],
    ['Satellite image date', satelliteDateLabel],
    ['Predicted class', toDisplayValue(report?.predictedClass)],
    ['Confidence', confidenceLabel],
    ['Status', toDisplayValue(report?.status, 'Recorded')]
  ];
  const technicalRows = [
    ['NDVI', formatIndex(report?.ndviValue)],
    ['EVI', formatIndex(report?.eviValue)],
    ['Land-cover workflow', 'ResNet-50-assisted'],
    ['EuroSAT class', toDisplayValue(report?.euroSatClass || report?.predictedClass)],
    ['Satellite source', report?.satelliteSource ? report.satelliteSource : null],
    [
      'Cloud coverage',
      report?.cloudCoverage !== null && report?.cloudCoverage !== undefined
        ? `${report.cloudCoverage}%`
        : null
    ],
    [
      'Quality flags',
      Array.isArray(report?.qualityFlags) && report.qualityFlags.length
        ? report.qualityFlags.join(', ')
        : null
    ]
  ];
  const summaryRowsMarkup = buildDetailRowsMarkup(summaryRows);
  const contextRowsMarkup = buildDetailRowsMarkup(contextRows);
  const technicalRowsMarkup = buildDetailRowsMarkup(technicalRows);
  const historyMarkup = historyEntries.length
    ? `
      <section class="card">
        <h2>Recent history</h2>
        <div class="history-list">
          ${historyEntries.map((item) => (
            `<div class="history-item"><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.summary)}</span></div>`
          )).join('')}
        </div>
      </section>
    `
    : '';
  const mapMarkup = mapImageDataUrl
    ? buildCapturedMapMarkup(mapImageDataUrl, displayFieldName, report?.riskLevel)
    : buildSvgMapMarkup(geoJsonData, displayFieldName, report?.riskLevel);
  const contextNoticeMarkup = contextNotice
    ? `<div class="banner">${escapeHtml(contextNotice)}</div>`
    : '';
  const generatedAt = formatWorkspaceDateTime(new Date().toISOString(), 'Not available');

  reportWindow.document.title = `${displayFieldName} - AgroVision report`;
  reportWindow.document.open();
  reportWindow.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(displayFieldName)} - AgroVision report</title>
    <style>
      @page {
        size: A4;
        margin: 12mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        font-family: Inter, "Segoe UI", Arial, sans-serif;
        color: #0f172a;
        background: #ffffff;
      }

      main {
        display: grid;
        gap: 14px;
      }

      .hero {
        border: 1px solid #cbd5e1;
        border-radius: 22px;
        padding: 22px;
        background: linear-gradient(135deg, #eff6ff, #ecfeff 58%, #f0fdf4);
      }

      .eyebrow {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #2563eb;
        margin-bottom: 10px;
      }

      h1 {
        margin: 0 0 8px;
        font-size: 28px;
        line-height: 1.12;
      }

      .subtitle {
        margin: 0;
        color: #475569;
        line-height: 1.6;
      }

      .card {
        border: 1px solid #cbd5e1;
        border-radius: 18px;
        padding: 18px;
        background: #ffffff;
        page-break-inside: avoid;
      }

      h2 {
        margin: 0 0 12px;
        font-size: 17px;
      }

      .detail-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .detail-row {
        display: grid;
        gap: 6px;
        padding: 12px 13px;
        border-radius: 14px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
      }

      .detail-row span,
      .meta span,
      .history-item span,
      .map-card-head span,
      .map-empty span {
        color: #475569;
        font-size: 12px;
        line-height: 1.5;
      }

      .detail-row strong,
      .history-item strong,
      .map-card-head strong,
      .map-empty strong {
        font-size: 14px;
        line-height: 1.45;
      }

      .report-layout {
        display: grid;
        grid-template-columns: minmax(0, 1.1fr) minmax(290px, 0.9fr);
        gap: 14px;
        align-items: start;
      }

      .report-layout > * {
        min-width: 0;
      }

      .map-card {
        border-radius: 18px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        padding: 14px;
        display: grid;
        gap: 12px;
      }

      .map-card-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }

      .map-card-head > div {
        display: grid;
        gap: 4px;
      }

      .map-priority {
        font-size: 12px;
        font-weight: 700;
        white-space: nowrap;
      }

      .map-svg,
      .map-image {
        width: 100%;
        height: auto;
        display: block;
        border-radius: 18px;
        overflow: hidden;
        border: 1px solid #dbeafe;
      }

      .map-empty {
        min-height: 240px;
        display: grid;
        place-items: center;
        gap: 6px;
        text-align: center;
        border-radius: 18px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        padding: 20px;
      }

      .recommendation {
        border-color: #bfdbfe;
        background: #eff6ff;
      }

      .recommendation p {
        margin: 0;
        line-height: 1.7;
      }

      .banner {
        padding: 12px 13px;
        border-radius: 14px;
        border: 1px solid #bfdbfe;
        background: #eff6ff;
        color: #1d4ed8;
        font-size: 12px;
        line-height: 1.6;
      }

      .history-list {
        display: grid;
        gap: 10px;
      }

      .history-item {
        display: grid;
        gap: 4px;
        padding: 12px 13px;
        border-radius: 14px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
      }

      .meta {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        border-top: 1px solid #e2e8f0;
        padding-top: 14px;
        flex-wrap: wrap;
      }

      @media print {
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div class="eyebrow">AgroVision report</div>
        <h1>${escapeHtml(displayFieldName)}</h1>
        <p class="subtitle">Satellite-based analysis result prepared for PDF export, including the field map and report details.</p>
      </section>

      <section class="card">
        <h2>Report summary</h2>
        <div class="detail-grid">
          ${summaryRowsMarkup}
        </div>
      </section>

      <section class="card">
        <h2>Field map and context</h2>
        <div class="report-layout">
          ${mapMarkup}
          <div class="detail-grid">
            ${contextRowsMarkup}
          </div>
        </div>
      </section>

      ${contextNoticeMarkup}

      <section class="card recommendation">
        <h2>${escapeHtml(recommendationHeadline)}</h2>
        <p>${escapeHtml(toDisplayValue(recommendation))}</p>
      </section>

      <section class="card">
        <h2>Technical details</h2>
        <div class="detail-grid">
          ${technicalRowsMarkup}
        </div>
      </section>

      ${historyMarkup}

      <section class="card">
        <h2>Notes</h2>
        <div class="history-list">
          <div class="history-item">
            <strong>Monitoring limitation</strong>
            <span>${escapeHtml(ANALYSIS_LIMITATION_NOTE)}</span>
          </div>
        </div>
        <div class="meta">
          <span>Generated at: ${escapeHtml(generatedAt)}</span>
          <span>Prepared in AgroVision</span>
        </div>
      </section>
    </main>
  </body>
</html>`);
  reportWindow.document.close();

  let didTriggerPrint = false;
  const triggerPrint = () => {
    if (didTriggerPrint) {
      return;
    }

    didTriggerPrint = true;
    reportWindow.focus();
    reportWindow.print();
  };

  reportWindow.onload = triggerPrint;
  window.setTimeout(triggerPrint, 400);

  return true;
};
