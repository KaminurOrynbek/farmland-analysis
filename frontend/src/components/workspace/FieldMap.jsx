import React, { useEffect, useMemo } from 'react';
import {
  Circle,
  GeoJSON,
  ImageOverlay,
  MapContainer,
  Polygon,
  Popup,
  TileLayer,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import 'leaflet/dist/leaflet.css';
import { getFieldPermissions } from '../../permissions/permissions';
import { computeBboxFromGeoJson } from '../../utils/geoUtils';
import { getFeatureIdentity } from '../../utils/fieldIdentity';
import { getRiskColor } from '../../utils/fieldAnalysisUtils';
import MapLegend from './FieldMapLegend';
import { getRiskLabel, t } from '../../i18n.js';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

window.L = L;

const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const DEMO_FIELDS = [
  {
    id: 'demo-1',
    name: 'Demo wheat parcel',
    positions: [
      [51.160, 71.400],
      [51.160, 71.415],
      [51.150, 71.415],
      [51.150, 71.400]
    ],
    risk: 'Low'
  },
  {
    id: 'demo-2',
    name: 'Demo stress parcel',
    positions: [
      [51.148, 71.420],
      [51.148, 71.435],
      [51.135, 71.430],
      [51.138, 71.418]
    ],
    risk: 'Medium'
  }
];

const DEMO_STRESS_ZONES = [
  { id: 'zone-1', center: [51.142, 71.425], radius: 150 },
  { id: 'zone-2', center: [51.145, 71.428], radius: 100 }
];

const getPriorityLabel = (riskLevel) => {
  if (riskLevel === 'Low') {
    return t('Low priority');
  }

  if (riskLevel === 'Medium') {
    return t('Medium priority');
  }

  if (riskLevel === 'High' || riskLevel === 'Critical') {
    return t('High priority');
  }

  return t('Not analyzed');
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const toOverlaySeed = (value) => {
  const text = String(value || 'agrovision');
  let hash = 0;

  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash) || 1;
};

const createRandomGenerator = (seed) => {
  let value = seed % 2147483647;

  if (value <= 0) {
    value += 2147483646;
  }

  return () => {
    value = value * 16807 % 2147483647;
    return (value - 1) / 2147483646;
  };
};

const normalizeFeatureCollection = (input) => {
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

const OVERLAY_PALETTE = [
  [0, [255, 45, 32]],
  [0.22, [255, 106, 31]],
  [0.48, [255, 233, 61]],
  [0.74, [143, 228, 47]],
  [1, [18, 185, 129]]
];

const lerp = (start, end, amount) => start + (end - start) * amount;

const smoothstep = (value) => value * value * (3 - 2 * value);

const sampleHashNoise = (x, y, seed) => {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 0.01745) * 43758.5453123;
  return value - Math.floor(value);
};

const sampleValueNoise = (x, y, seed) => {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const mixX = smoothstep(x - x0);
  const mixY = smoothstep(y - y0);
  const n00 = sampleHashNoise(x0, y0, seed);
  const n10 = sampleHashNoise(x1, y0, seed);
  const n01 = sampleHashNoise(x0, y1, seed);
  const n11 = sampleHashNoise(x1, y1, seed);
  const top = lerp(n00, n10, mixX);
  const bottom = lerp(n01, n11, mixX);

  return lerp(top, bottom, mixY);
};

const sampleFractalNoise = (x, y, seed, octaves = 4) => {
  let total = 0;
  let amplitude = 1;
  let frequency = 1;
  let amplitudeTotal = 0;

  for (let octave = 0; octave < octaves; octave += 1) {
    total += sampleValueNoise(x * frequency, y * frequency, seed + octave * 53) * amplitude;
    amplitudeTotal += amplitude;
    amplitude *= 0.56;
    frequency *= 2.05;
  }

  return amplitudeTotal ? total / amplitudeTotal : 0;
};

const toNormalizedPoint = ([lng, lat], minLng, minLat, width, height) => ([
  clamp((lng - minLng) / width, 0, 1),
  clamp(1 - (lat - minLat) / height, 0, 1)
]);

const normalizePolygons = (polygons, minLng, minLat, width, height) => (
  polygons
    .map((polygon) => polygon
      .map((ring) => (
        Array.isArray(ring)
          ? ring
              .filter((pair) => Array.isArray(pair) && pair.length >= 2)
              .map((pair) => toNormalizedPoint(pair, minLng, minLat, width, height))
          : []
      ))
      .filter((ring) => ring.length >= 3))
    .filter((polygon) => polygon.length)
);

const pointInRing = (pointX, pointY, ring) => {
  let inside = false;

  for (let index = 0, previousIndex = ring.length - 1; index < ring.length; previousIndex = index, index += 1) {
    const [x1, y1] = ring[index];
    const [x2, y2] = ring[previousIndex];
    const intersects =
      ((y1 > pointY) !== (y2 > pointY)) &&
      pointX < ((x2 - x1) * (pointY - y1)) / ((y2 - y1) || Number.EPSILON) + x1;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
};

const pointInPolygon = (pointX, pointY, polygon) => {
  if (!polygon.length || !pointInRing(pointX, pointY, polygon[0])) {
    return false;
  }

  for (let index = 1; index < polygon.length; index += 1) {
    if (pointInRing(pointX, pointY, polygon[index])) {
      return false;
    }
  }

  return true;
};

const pointInPolygons = (pointX, pointY, polygons) => (
  polygons.some((polygon) => pointInPolygon(pointX, pointY, polygon))
);

const samplePaletteColor = (value) => {
  const clampedValue = clamp(value, 0, 1);

  for (let index = 1; index < OVERLAY_PALETTE.length; index += 1) {
    const [endStop, endColor] = OVERLAY_PALETTE[index];
    const [startStop, startColor] = OVERLAY_PALETTE[index - 1];

    if (clampedValue <= endStop) {
      const mix = (clampedValue - startStop) / Math.max(endStop - startStop, Number.EPSILON);

      return [
        Math.round(lerp(startColor[0], endColor[0], mix)),
        Math.round(lerp(startColor[1], endColor[1], mix)),
        Math.round(lerp(startColor[2], endColor[2], mix))
      ];
    }
  }

  return OVERLAY_PALETTE[OVERLAY_PALETTE.length - 1][1];
};

const buildAnalysisOverlay = ({
  geoJsonData,
  analysisResults,
  fieldRiskLevel,
  fieldName
}) => {
  if (typeof document === 'undefined') {
    return null;
  }

  const featureCollection = normalizeFeatureCollection(geoJsonData);
  const bbox = computeBboxFromGeoJson(featureCollection);

  if (!featureCollection?.features?.length || !bbox) {
    return null;
  }

  const polygons = [];
  featureCollection.features.forEach((feature) => collectPolygonRings(feature?.geometry, polygons));

  if (!polygons.length) {
    return null;
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

  const width = maxLng - minLng;
  const height = maxLat - minLat;
  const normalizedPolygons = normalizePolygons(polygons, minLng, minLat, width, height);

  if (!normalizedPolygons.length) {
    return null;
  }

  const seed = toOverlaySeed([
    fieldName,
    analysisResults?.analysisId,
    analysisResults?.ndviValue,
    analysisResults?.eviValue,
    fieldRiskLevel
  ].join(':'));
  const random = createRandomGenerator(seed);
  const ndviValue = clamp(Number(analysisResults?.ndviValue ?? 0.5), 0, 1);
  const eviValue = clamp(Number(analysisResults?.eviValue ?? 0.35), 0, 1);
  const baseHealth = clamp(ndviValue * 0.68 + eviValue * 0.32, 0.1, 0.92);
  const riskPenalty = (
    fieldRiskLevel === 'High' || fieldRiskLevel === 'Critical'
      ? 0.28
      : fieldRiskLevel === 'Medium'
        ? 0.16
        : fieldRiskLevel === 'Low'
          ? -0.06
          : 0.06
  );
  const stressBias = clamp((1 - baseHealth) * 0.48 + riskPenalty, 0.08, 0.78);
  const canvasSize = 360;
  const canvas = document.createElement('canvas');
  canvas.width = canvasSize;
  canvas.height = canvasSize;
  const context = canvas.getContext('2d');

  if (!context) {
    return null;
  }

  const directionAngle = random() * Math.PI;
  const stripeAngle = directionAngle + Math.PI / 2;
  const directionCos = Math.cos(directionAngle);
  const directionSin = Math.sin(directionAngle);
  const stripeCos = Math.cos(stripeAngle);
  const stripeSin = Math.sin(stripeAngle);
  const phase = random() * Math.PI * 2;
  const macroScale = 2.6 + random() * 1.2;
  const detailScale = 7.4 + random() * 3;
  const waveScale = 2.1 + random() * 1.1;
  const stripeScale = 12 + random() * 8;
  const warmZoneCount = 3 + Math.round(stressBias * 4);
  const coolZoneCount = 2 + Math.round(baseHealth * 3);
  const buildZones = (count, isWarm) => Array.from({ length: count }, () => ({
    x: 0.14 + random() * 0.72,
    y: 0.14 + random() * 0.72,
    radius: 0.08 + random() * 0.18,
    weight: isWarm
      ? -(0.08 + random() * 0.24 + stressBias * 0.1)
      : 0.04 + random() * 0.16 + baseHealth * 0.04
  }));
  const warmZones = buildZones(warmZoneCount, true);
  const coolZones = buildZones(coolZoneCount, false);
  const applyZones = (pointX, pointY, zones) => zones.reduce((total, zone) => {
    const deltaX = pointX - zone.x;
    const deltaY = pointY - zone.y;
    const distanceSquared = deltaX * deltaX + deltaY * deltaY;

    return total + zone.weight * Math.exp(-distanceSquared / (2 * zone.radius * zone.radius));
  }, 0);
  const imageData = context.createImageData(canvasSize, canvasSize);
  const { data } = imageData;

  for (let y = 0; y < canvasSize; y += 1) {
    const pointY = y / (canvasSize - 1);

    for (let x = 0; x < canvasSize; x += 1) {
      const pointX = x / (canvasSize - 1);
      const pixelIndex = (y * canvasSize + x) * 4;

      if (!pointInPolygons(pointX, pointY, normalizedPolygons)) {
        data[pixelIndex + 3] = 0;
        continue;
      }

      const macroNoise = sampleFractalNoise(pointX * macroScale, pointY * macroScale, seed, 4);
      const detailNoise = sampleFractalNoise(pointX * detailScale + 4.7, pointY * detailScale + 8.3, seed + 71, 3);
      const directionalWave = Math.cos(((pointX * directionCos + pointY * directionSin) * Math.PI * waveScale) + phase);
      const rowPattern = Math.sin(((pointX * stripeCos + pointY * stripeSin) * Math.PI * stripeScale) + phase * 0.7);
      const zoneEffect = applyZones(pointX, pointY, warmZones) + applyZones(pointX, pointY, coolZones);

      let value =
        baseHealth * 0.58 +
        macroNoise * 0.19 +
        detailNoise * 0.11 +
        (directionalWave * 0.5 + 0.5) * 0.07 +
        (rowPattern * 0.5 + 0.5) * 0.05 +
        zoneEffect -
        stressBias * 0.08;

      value = clamp((value - 0.5) * 1.12 + 0.5, 0, 1);

      const [red, green, blue] = samplePaletteColor(value);
      const alpha = Math.round(230 + sampleValueNoise(pointX * 18 + 6, pointY * 18 + 2, seed + 91) * 16);

      data[pixelIndex] = red;
      data[pixelIndex + 1] = green;
      data[pixelIndex + 2] = blue;
      data[pixelIndex + 3] = alpha;
    }
  }

  context.putImageData(imageData, 0, 0);

  return {
    url: canvas.toDataURL('image/png'),
    bounds: [
      [minLat, minLng],
      [maxLat, maxLng]
    ]
  };
};

function GeomanDrawControl({ onDrawn }) {
  const map = useMap();

  useEffect(() => {
    if (!map || !map.pm) {
      return undefined;
    }

    map.pm.addControls({
      position: 'topleft',
      drawCircle: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: true,
      drawPolygon: true,
      drawText: false,
      drawMarker: false,
      editMode: true,
      dragMode: false,
      cutPolygon: false,
      removalMode: true
    });

    const markGuideToolbar = () => {
      const mapContainer = map.getContainer();
      const toolbar = mapContainer.querySelector('.leaflet-pm-toolbar');
      if (toolbar) {
        toolbar.setAttribute('data-guide', 'draw-toolbar');
      }

      [
        ['.leaflet-pm-icon-polygon', 'draw-polygon-control'],
        ['.leaflet-pm-icon-rectangle', 'draw-rectangle-control']
      ].forEach(([selector, guideId]) => {
        const control = mapContainer.querySelector(selector);
        const guideTarget = control?.closest('a, .button-container') || control;
        guideTarget?.setAttribute('data-guide', guideId);
      });
    };

    markGuideToolbar();
    const toolbarMarkTimeout = window.setTimeout(markGuideToolbar, 0);

    const handleCreate = (event) => {
      if (event.shape === 'Polygon' || event.shape === 'Rectangle') {
        const geojson = event.layer.toGeoJSON();
        map.removeLayer(event.layer);

        onDrawn?.({
          type: 'FeatureCollection',
              features: [
            {
              type: 'Feature',
              properties: { name: t('Manual drawing') },
              geometry: geojson.geometry
            }
          ]
        });
      }
    };

    map.on('pm:create', handleCreate);

    return () => {
      window.clearTimeout(toolbarMarkTimeout);

      if (map.pm) {
        map.pm.removeControls();
      }

      map.off('pm:create', handleCreate);
    };
  }, [map, onDrawn]);

  return null;
}

function GeoJSONFitter({ data }) {
  const map = useMap();

  useEffect(() => {
    if (!data) {
      return;
    }

    try {
      const geoJsonLayer = L.geoJSON(data);
      const bounds = geoJsonLayer.getBounds();

      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [24, 24],
          maxZoom: 21
        });
      }
    } catch (error) {
      console.error('Could not fit feature bounds', error);
    }
  }, [data, map]);

  return null;
}

function MapSizeInvalidator({ dependencyKey }) {
  const map = useMap();

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      map.invalidateSize();
    });
    const timeoutId = window.setTimeout(() => {
      map.invalidateSize();
    }, 220);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [dependencyKey, map]);

  return null;
}

export default function FieldMap({
  user,
  backendHealthy,
  analysisStarted,
  isAnalyzing,
  geoJsonData,
  selectedField,
  setSelectedField,
  fieldLayerVisible,
  onPolygonDrawn,
  analysisResults,
  fieldRiskLevel,
  fieldName,
  hasStoredAnalysis,
  readOnly = false,
  showDemoData = true,
  showLegend = true,
  legendMode = null,
  showInfoCard = true,
  showBackendBanner = true
}) {
  const center = [51.150, 71.415];
  const permissions = getFieldPermissions(selectedField?.properties || selectedField, user);
  const canUseDrawingTools =
    !readOnly &&
    !isAnalyzing &&
    (permissions.canEditField || (!selectedField && permissions.canCreateField));

  const activeRisk = fieldRiskLevel || analysisResults?.riskLevel || null;
  const activeColor = getRiskColor(activeRisk);
  const mapStatusLabel = hasStoredAnalysis
    ? getPriorityLabel(activeRisk)
    : 'Not analyzed';
  const resolvedLegendMode = legendMode || (hasStoredAnalysis ? 'analysis' : 'priority');
  const mapDependencyKey = JSON.stringify({
    hasGeoJson: Boolean(geoJsonData),
    selectedField: selectedField?.properties?.id || selectedField?.properties?.field_id || selectedField?.properties?.name || null,
    fieldLayerVisible,
    hasStoredAnalysis,
    legendMode: resolvedLegendMode
  });
  const analysisOverlay = useMemo(() => (
    hasStoredAnalysis
      ? buildAnalysisOverlay({
          geoJsonData,
          analysisResults,
          fieldRiskLevel: activeRisk,
          fieldName
        })
      : null
  ), [activeRisk, analysisResults, fieldName, geoJsonData, hasStoredAnalysis]);

  const onEachFeature = (feature, layer) => {
    layer.on({
      click: (event) => {
        setSelectedField?.(feature);
        event.originalEvent.stopPropagation();
      }
    });

    const popupName =
      feature?.properties?.name ||
      feature?.properties?.field_id ||
      t('Selected field');

    layer.bindPopup(`
      <div style="min-width:180px">
        <strong>${popupName}</strong><br />
        ${t('Inspection priority')}: ${mapStatusLabel}
      </div>
    `);
  };

  const getGeoJsonStyle = (feature) => {
    const isSelected =
      Boolean(selectedField) &&
      getFeatureIdentity(selectedField) === getFeatureIdentity(feature);
    const color = hasStoredAnalysis ? activeColor : 'var(--text-secondary)';

    return {
      color: hasStoredAnalysis
        ? (isSelected ? '#ffffff' : 'rgba(248,250,252,0.96)')
        : (isSelected ? '#e2e8f0' : color),
      weight: isSelected ? 4 : hasStoredAnalysis ? 3.1 : 2.5,
      opacity: isSelected ? 1 : 0.88,
      fillColor: hasStoredAnalysis ? '#ffffff' : color,
      fillOpacity: hasStoredAnalysis ? 0.04 : 0.18,
      dashArray: isSelected ? '' : '6 6'
    };
  };

  return (
    <div className="workspace-map-shell workspace-map-frame" style={{ flex: 1, width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <MapContainer
        center={center}
        zoom={13}
        maxZoom={22}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          minHeight: '100%',
          background: '#0f172a',
          // filter: isAnalyzing ? 'grayscale(0.15)' : 'none',
          filter: 'none',
          transition: 'filter 0.35s ease'
        }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          maxZoom={22}
          maxNativeZoom={19}
          crossOrigin="anonymous"
        />

        {geoJsonData ? <GeoJSONFitter data={geoJsonData} /> : null}
        <MapSizeInvalidator dependencyKey={mapDependencyKey} />
        {canUseDrawingTools ? <GeomanDrawControl onDrawn={onPolygonDrawn} /> : null}
        {fieldLayerVisible && analysisOverlay ? (
          <ImageOverlay
            url={analysisOverlay.url}
            bounds={analysisOverlay.bounds}
            opacity={0.96}
            interactive={false}
          />
        ) : null}

        {fieldLayerVisible && geoJsonData ? (
          <GeoJSON
            key={JSON.stringify(geoJsonData).length}
            data={geoJsonData}
            style={getGeoJsonStyle}
            onEachFeature={onEachFeature}
          />
        ) : fieldLayerVisible && showDemoData ? (
          DEMO_FIELDS.map((field) => (
            <Polygon
              key={field.id}
              positions={field.positions}
              pathOptions={{
                color: getRiskColor(field.risk),
                fillColor: getRiskColor(field.risk),
                fillOpacity: 0.22,
                weight: 2
              }}
              eventHandlers={{
                click: (event) => {
                  setSelectedField?.({ properties: { ...field, name: field.name } });
                  event.originalEvent.stopPropagation();
                }
              }}
            >
              <Popup>
                <div>
                  <strong>{t(field.name)}</strong>
                  <br />
                  {t('Status')}: {getRiskLabel(field.risk)}
                </div>
              </Popup>
            </Polygon>
          ))
        ) : null}

        {(analysisStarted || hasStoredAnalysis) && !geoJsonData && showDemoData
          ? DEMO_STRESS_ZONES.map((zone) => (
              <Circle
                key={zone.id}
                center={zone.center}
                radius={zone.radius}
                pathOptions={{
                  color: 'transparent',
                  fillColor: 'var(--status-critical)',
                  fillOpacity: 0.35
                }}
              />
            ))
          : null}
      </MapContainer>

      {showInfoCard ? (
        <div className="map-info-card glass-panel">
          <div>
            <strong>{fieldName || t('Field workspace map')}</strong>
            <p className="workspace-helper-text">
              {hasStoredAnalysis
                ? t('Inspection priority') + `: ${mapStatusLabel}`
                : t('Gray boundaries mean the field has not been analyzed yet.')}
            </p>
          </div>
          <span className="status-pill neutral">
            {mapStatusLabel}
          </span>
        </div>
      ) : null}

      {showLegend ? <MapLegend mode={resolvedLegendMode} /> : null}

      {!backendHealthy && showBackendBanner ? (
        <div className="map-demo-banner glass-panel">
          {t('Backend is offline. Demo polygons remain available until live field data is loaded.')}
        </div>
      ) : null}
    </div>
  );
}
