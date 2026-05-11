import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Circle, Popup, useMap, ImageOverlay, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
// FIX: Geoman expects L to be global when imported as a side-effect in some environments
window.L = L;
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import 'leaflet/dist/leaflet.css';

// Fix for icon issues in Leaflet with React
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Mock data representing farmland fields
const fieldPolygons = [
  {
    id: 1,
    positions: [
      [51.160, 71.400],
      [51.160, 71.415],
      [51.150, 71.415],
      [51.150, 71.400],
    ],
    crop: 'Winter Wheat',
    health: 'Healthy',
    color: '#22c55e'
  },
  {
    id: 2,
    positions: [
      [51.148, 71.420],
      [51.148, 71.435],
      [51.135, 71.430],
      [51.138, 71.418],
    ],
    crop: 'Corn',
    health: 'Stress Detected',
    color: '#eab308'
  }
];

// Mock heatmap points representing severe stress zones
const stressZones = [
  { id: 1, center: [51.142, 71.425], radius: 150, color: '#ef4444' },
  { id: 2, center: [51.145, 71.428], radius: 100, color: '#ef4444' }
];

export default function MapView({ 
  analysisStarted,
  isAnalyzing,
  geoJsonData,
  selectedField,
  setSelectedField,
  fieldLayerVisible,
  onPolygonDrawn
}) {
  // Center of Kazakhstan farmland approximate coordinates (near Astana for demo)
  const center = [51.150, 71.415]; 

  function GeomanDrawControl({ onDrawn }) {
    const map = useMap();

    useEffect(() => {
      if (!map) return;
      
      // If map.pm is still not there, Geoman didn't attach. 
      // We can try to manually re-init if the plugin exposed it, but usually it's on Map prototype.
      if (!map.pm) {
        console.error("Critical: Geoman (map.pm) is still undefined. Drawing tools will not load.");
        return;
      }

      try {
        // Initialize Geoman Controls
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
        removalMode: true,
        });
      } catch (err) {
        console.error("Geoman control initialization failed", err);
      }

      // Listen for shape creation
      map.on('pm:create', (e) => {
        if (e.shape === 'Polygon' || e.shape === 'Rectangle') {
          const geojson = e.layer.toGeoJSON();
          if (typeof onDrawn === 'function') {
            const featureCollection = {
              type: "FeatureCollection",
              features: [
                {
                  type: "Feature",
                  properties: { name: "Manual Drawing" },
                  geometry: geojson.geometry
                }
              ]
            };
            onDrawn(featureCollection);
          }
        }
      });

      // Cleanup
      return () => {
        if (map && map.pm) {
          map.pm.removeControls();
          map.off('pm:create');
        }
      };
    }, [map, onDrawn]);

    return null;
  }

  // Component to automatically fit map to new GeoJSON bounds
  function GeoJSONFitter({ data }) {
    const map = useMap();
    useEffect(() => {
      if (data) {
        try {
          const geoJsonLayer = L.geoJSON(data);
          const bounds = geoJsonLayer.getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [20, 20] });
          }
        } catch (e) {
          console.error("Could not fit feature bounds", e);
        }
      }
    }, [data, map]);
    return null;
  }

  // Handle styles and clicks for GeoJSON features
  const onEachFeature = (feature, layer) => {
    layer.on({
      click: (e) => {
        setSelectedField(feature);
        e.originalEvent.stopPropagation(); // prevent map click from immediately unselecting
      }
    });
  };

  const getGeoJsonStyle = (feature) => {
    const isSelected = selectedField && selectedField.properties?.id === feature.properties?.id;
    // Simulate some color based on analysis and properties, or fallback to default
    const color = analysisStarted ? (feature.properties?.health === 'Poor' ? '#ef4444' : '#22c55e') : (isSelected ? '#3b82f6' : 'var(--text-secondary)');
    
    return {
      color: isSelected ? '#ffffff' : color, 
      weight: isSelected ? 3 : 2,
      fillColor: color,
      fillOpacity: isSelected ? 0.6 : (analysisStarted ? 0.4 : 0.2),
      dashArray: isSelected ? '' : '3'
    };
  };

  return (
    <div style={{ flex: 1, width: '100%', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <MapContainer 
        center={center} 
        zoom={13} 
        style={{ 
          flex: 1, 
          width: '100%',
          filter: isAnalyzing ? 'grayscale(0.5) blur(1px)' : 'none',
          transition: 'filter 0.5s ease'
        }}
        zoomControl={false}
      >
        {/* Esri World Imagery Basemap for satellite view */}
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a>, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        />

        {/* Auto fit bounds when GeoJSON changes */}
        {geoJsonData && <GeoJSONFitter data={geoJsonData} />}

        {/* Drawing Tools using Geoman */}
        <GeomanDrawControl onDrawn={onPolygonDrawn} />

        {/* Render Uploaded GeoJSON or Fallback Polygons */}
        {fieldLayerVisible && geoJsonData ? (
          <GeoJSON 
            key={JSON.stringify(geoJsonData).length} // force re-render if data size changes
            data={geoJsonData}
            style={getGeoJsonStyle}
            onEachFeature={onEachFeature}
          />
        ) : fieldLayerVisible ? (
          // Render mock field Polygons
          fieldPolygons.map(field => (
            <Polygon 
              key={field.id}
              positions={field.positions} 
              pathOptions={{ 
                color: analysisStarted ? field.color : 'var(--text-secondary)', 
                fillColor: analysisStarted ? field.color : 'rgba(255,255,255,0.1)',
                fillOpacity: analysisStarted ? 0.4 : 0.2,
                weight: 2
              }}
              eventHandlers={{
                click: (e) => {
                  // Mocks the GeoJSON structure for compatibility
                  setSelectedField({ properties: { ...field, name: `Field ${field.id}` } });
                  e.originalEvent.stopPropagation();
                }
              }}
            >
              <Popup>
                <div>
                  <strong>Field {field.id}</strong><br/>
                  Crop: {field.crop}<br/>
                  Status: {analysisStarted ? field.health : 'Unanalyzed'}
                </div>
              </Popup>
            </Polygon>
          ))
        ) : null}

        {/* Render Mock Heatmap / Stress Zones Only After Analysis */}
        {analysisStarted && stressZones.map(zone => (
          <Circle
            key={zone.id}
            center={zone.center}
            radius={zone.radius}
            pathOptions={{
              color: 'transparent',
              fillColor: zone.color,
              fillOpacity: isAnalyzing ? 0.1 : 0.6
            }}
          />
        ))}
      </MapContainer>

      {/* Custom Overlay UI representing map controls could go here */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(8px)',
        padding: '8px 16px',
        borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        gap: '16px',
        fontSize: '0.85rem',
        color: 'var(--text-primary)'
      }}>
        <span>Lat: 51.1501° N</span>
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)' }} />
        <span>Lng: 71.4152° E</span>
        <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)' }} />
        <span>Zoom: 13</span>
      </div>
    </div>
  );
}
