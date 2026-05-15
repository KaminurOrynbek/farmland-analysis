import React, { useRef } from 'react';
import { Upload, Play, Layers, Map as MapIcon, Settings, X, Image as ImageIcon, AlertTriangle, FileJson } from 'lucide-react';
import { saveField } from '../api';

const normalizeGeoJson = (geoJson, metadata = {}) => {
  if (geoJson.type === 'FeatureCollection') {
    return {
      ...geoJson,
      features: geoJson.features.map((feature, index) => (
        index === 0
          ? {
              ...feature,
              properties: {
                ...feature.properties,
                ...metadata
              }
            }
          : feature
      ))
    };
  }

  if (geoJson.type === 'Feature') {
    return {
      type: 'FeatureCollection',
      features: [
        {
          ...geoJson,
          properties: {
            ...geoJson.properties,
            ...metadata
          }
        }
      ]
    };
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          ...metadata
        },
        geometry: geoJson
      }
    ]
  };
};

export default function Sidebar({ 
  isAnalyzing,
  onRunAnalysis,
  isFetchingSatelliteData,
  onFetchSatelliteData,
  geoJsonData,
  setGeoJsonData,
  geoJsonMeta,
  setGeoJsonMeta,
  geoJsonUploadResponse,
  setGeoJsonUploadResponse,
  geoJsonUploadError,
  setGeoJsonUploadError,
  fieldLayerVisible,
  setFieldLayerVisible,
  setSelectedField,
  onFieldSaved
}) {
  const geoJsonInputRef = useRef(null);

  const handleGeoJsonUpload = async (e) => {
    const file = e.target.files[0];
    if (file && (file.name.endsWith('.geojson') || file.name.endsWith('.json'))) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsedJson = JSON.parse(event.target.result);
          const normalizedData = normalizeGeoJson(parsedJson);
          setGeoJsonData(normalizedData);
          setGeoJsonMeta({
            name: file.name,
            size: (file.size / 1024).toFixed(1) // KB
          });

          setGeoJsonUploadError(null);
          try {
            const geometryToSave = normalizedData.features[0]?.geometry;
            
            // Send geometry to PostgreSQL database via our API adapter
            const response = await saveField(file.name, geometryToSave, 0.0);
            const fieldMetadata = {
              id: response.data.field_id,
              field_id: response.data.field_id,
              name: response.data.name || file.name,
              area: 0.0
            };
            const enrichedData = normalizeGeoJson(parsedJson, fieldMetadata);

            setGeoJsonData(enrichedData);
            setGeoJsonUploadResponse(response);
            setSelectedField(enrichedData.features[0]);
            onFieldSaved?.();
          } catch (error) {
            setGeoJsonUploadError('Backend database validation failed.');
            console.error('GeoJSON DB save failed', error);
          }
        } catch (error) {
          console.error('Error parsing GeoJSON', error);
          alert('Invalid GeoJSON file. Must be standard GeoJSON format.');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleRemoveGeoJson = () => {
    setGeoJsonData(null);
    setGeoJsonMeta(null);
    setGeoJsonUploadResponse(null);
    setGeoJsonUploadError(null);
    setSelectedField(null);
    if (geoJsonInputRef.current) {
      geoJsonInputRef.current.value = "";
    }
  };

  return (
    <aside className="glass-panel" style={{
      width: '280px',
      flexShrink: 0,
      height: '100%',
      borderRight: '1px solid var(--border-color)',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      zIndex: 10,
      overflowY: 'auto'
    }}>
      {/* DATA INPUT SECTION */}
      <div>
        <h2 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Data Input
        </h2>
        
        <input 
          type="file" 
          accept=".geojson,.json"
          ref={geoJsonInputRef}
          onChange={handleGeoJsonUpload}
          style={{ display: 'none' }}
        />

        {!geoJsonData ? (
          <button 
            onClick={() => geoJsonInputRef.current?.click()}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '12px',
              backgroundColor: 'transparent',
              border: '1px dashed var(--accent-color)',
              color: 'var(--accent-color)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 500,
              transition: 'background 0.2s'
            }}>
            <Upload size={18} />
            Upload GeoJSON Boundaries
          </button>
        ) : (
          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '8px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-healthy)', fontWeight: 500, fontSize: '0.85rem' }}>
                <MapIcon size={16} />
                Field bounds loaded
              </div>
              <button 
                onClick={handleRemoveGeoJson}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  padding: '2px'
                }}
              >
                <X size={14} />
              </button>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <div style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {geoJsonMeta?.name}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{geoJsonMeta?.size ? `${geoJsonMeta.size} KB` : 'Manual drawing'}</span>
                {geoJsonUploadResponse ? (
                  <span style={{ color: 'var(--status-healthy)', fontSize: '0.7rem' }}>● Validated</span>
                ) : geoJsonUploadError ? (
                  <span style={{ color: 'var(--status-critical)', fontSize: '0.7rem' }}>⚠ Error</span>
                ) : (
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Validating...</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ height: '1px', background: 'var(--border-color)' }} />

      {/* DATA SOURCE SECTION */}
      <div>
        <h2 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Data Source
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Dataset Selector</label>
          <select style={{
            width: '100%',
            padding: '10px',
            backgroundColor: 'rgba(0,0,0,0.2)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            borderRadius: '6px',
            outline: 'none',
            fontSize: '0.9rem'
          }}>
            <option>Sentinel-2 (Optical)</option>
            <option>Landsat 8-9</option>
            <option>PlanetScope (High-Res)</option>
          </select>
        </div>
      </div>

      <div style={{ height: '1px', background: 'var(--border-color)' }} />

      {/* DATA ACTIONS SECTION */}
      <div>
        <h2 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Data Actions
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Fetch Satellite Data Button */}
          <button 
            onClick={onFetchSatelliteData}
            disabled={isFetchingSatelliteData || isAnalyzing}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '12px',
              backgroundColor: 'transparent',
              border: '1px solid var(--accent-color)',
              color: 'var(--accent-color)',
              borderRadius: '8px',
              cursor: (isFetchingSatelliteData || isAnalyzing) ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s',
              opacity: (isFetchingSatelliteData || isAnalyzing) ? 0.6 : 1
            }}
          >
            {isFetchingSatelliteData ? (
              <>
                <div className="spinner-mini" style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(59, 130, 246, 0.3)',
                  borderTop: '2px solid var(--accent-color)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Fetching...
              </>
            ) : (
              <>
                <ImageIcon size={18} />
                Fetch Satellite Data
              </>
            )}
          </button>

          {/* Run Analysis Button */}
          <button 
            onClick={onRunAnalysis}
            disabled={isAnalyzing || isFetchingSatelliteData || !geoJsonData}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              width: '100%',
              padding: '12px',
              backgroundColor: isAnalyzing ? 'rgba(59, 130, 246, 0.5)' : 'var(--accent-color)',
              border: 'none',
              color: 'white',
              borderRadius: '8px',
              cursor: (isAnalyzing || isFetchingSatelliteData || !geoJsonData) ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              boxShadow: isAnalyzing ? 'none' : '0 4px 14px 0 rgba(59, 130, 246, 0.39)',
              transition: 'all 0.2s',
              opacity: (isAnalyzing || !geoJsonData) ? 0.7 : 1
            }}
          >
            {isAnalyzing ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Analyzing...
              </>
            ) : (
              <>
                <Play fill="white" size={16} />
                Run Analysis
              </>
            )}
          </button>
        </div>
      </div>

      <div style={{ height: '1px', background: 'var(--border-color)' }} />

      {/* LAYER CONTROLS */}
      <div>
        <h2 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Layer Controls
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { id: 'base', name: 'Satellite Basemap', icon: <MapIcon size={16} />, active: true },
            { id: 'ndvi', name: 'NDVI Heatmap', icon: <Layers size={16} />, active: true }
          ].map(layer => (
            <label key={layer.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}>
              <input 
                type="checkbox" 
                defaultChecked={layer.active}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }} 
              />
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: layer.active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {layer.icon}
                {layer.name}
              </span>
            </label>
          ))}

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}>
            <input 
              type="checkbox" 
              checked={fieldLayerVisible}
              onChange={(e) => setFieldLayerVisible(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }} 
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: fieldLayerVisible ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              <Settings size={16} />
              Field Boundaries
            </span>
          </label>
        </div>
      </div>
      <style>
        {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
      </style>
    </aside>
  );
}
