import React, { useEffect } from 'react';
import { Circle, GeoJSON, MapContainer, Polygon, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import 'leaflet/dist/leaflet.css';
import { getFieldPermissions } from '../../permissions/permissions';
import { getFeatureIdentity } from '../../utils/fieldIdentity';
import { getRiskColor } from '../../utils/fieldAnalysisUtils';
import MapLegend from './FieldMapLegend';

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
              properties: { name: 'Manual drawing' },
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
        map.fitBounds(bounds, { padding: [24, 24] });
      }
    } catch (error) {
      console.error('Could not fit feature bounds', error);
    }
  }, [data, map]);

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
    ? activeRisk || 'Analysis available'
    : 'Not analyzed';

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
      'Selected field';

    layer.bindPopup(`
      <div style="min-width:180px">
        <strong>${popupName}</strong><br />
        Inspection priority: ${mapStatusLabel}
      </div>
    `);
  };

  const getGeoJsonStyle = (feature) => {
    const isSelected =
      Boolean(selectedField) &&
      getFeatureIdentity(selectedField) === getFeatureIdentity(feature);
    const color = hasStoredAnalysis ? activeColor : 'var(--text-secondary)';

    return {
      color: isSelected ? '#e2e8f0' : color,
      weight: isSelected ? 4 : 2.5,
      opacity: isSelected ? 1 : 0.88,
      fillColor: color,
      fillOpacity: hasStoredAnalysis ? (isSelected ? 0.48 : 0.34) : 0.18,
      dashArray: isSelected ? '' : '6 6'
    };
  };

  return (
    <div className="workspace-map-shell" style={{ flex: 1, width: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{
          flex: 1,
          width: '100%',
          filter: isAnalyzing ? 'grayscale(0.35) blur(1px)' : 'none',
          transition: 'filter 0.35s ease'
        }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />

        {geoJsonData ? <GeoJSONFitter data={geoJsonData} /> : null}
        {canUseDrawingTools ? <GeomanDrawControl onDrawn={onPolygonDrawn} /> : null}

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
                  <strong>{field.name}</strong>
                  <br />
                  Demo status: {field.risk}
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
            <strong>{fieldName || 'Field workspace map'}</strong>
            <p className="workspace-helper-text">
              {hasStoredAnalysis
                ? `Inspection priority: ${mapStatusLabel}`
                : 'Gray boundaries mean the field has not been analyzed yet.'}
            </p>
          </div>
          <span className="status-pill neutral">
            {mapStatusLabel}
          </span>
        </div>
      ) : null}

      {showLegend ? <MapLegend /> : null}

      {!backendHealthy && showBackendBanner ? (
        <div className="map-demo-banner glass-panel">
          Backend is offline. Demo polygons remain available until live field data is loaded.
        </div>
      ) : null}
    </div>
  );
}
