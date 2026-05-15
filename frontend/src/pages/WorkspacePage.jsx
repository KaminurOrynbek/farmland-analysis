import React from 'react';
import GuidedTour from '../components/GuidedTour';
import MapView from '../components/MapView';
import Sidebar from '../components/Sidebar';
import { Loader2 } from 'lucide-react';

export default function WorkspacePage({
  user,
  activePage,
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
  selectedField,
  setSelectedField,
  onPolygonDrawn,
  analysisResults,
  analysisStarted,
  onFieldSaved
}) {
  return (
    <div className="dashboard-content workspace-shell" style={{ position: 'relative' }}>
      <Sidebar
        user={user} 
        selectedField={selectedField}
        isAnalyzing={isAnalyzing}
        onRunAnalysis={onRunAnalysis}
        isFetchingSatelliteData={isFetchingSatelliteData}
        onFetchSatelliteData={onFetchSatelliteData}
        geoJsonData={geoJsonData}
        setGeoJsonData={setGeoJsonData}
        geoJsonMeta={geoJsonMeta}
        setGeoJsonMeta={setGeoJsonMeta}
        geoJsonUploadResponse={geoJsonUploadResponse}
        setGeoJsonUploadResponse={setGeoJsonUploadResponse}
        geoJsonUploadError={geoJsonUploadError}
        setGeoJsonUploadError={setGeoJsonUploadError}
        fieldLayerVisible={fieldLayerVisible}
        setFieldLayerVisible={setFieldLayerVisible}
        setSelectedField={setSelectedField}
        onFieldSaved={onFieldSaved}
      />

      <main className="map-container" style={{ position: 'relative' }}>
        <MapView
          user={user} 
          analysisStarted={analysisStarted}
          isAnalyzing={isAnalyzing}
          geoJsonData={geoJsonData}
          selectedField={selectedField}
          setSelectedField={setSelectedField}
          fieldLayerVisible={fieldLayerVisible}
          onPolygonDrawn={onPolygonDrawn}
          analysisResults={analysisResults}
        />
        
        {isAnalyzing && (
          <div style={{
            position: 'absolute',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '16px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            boxShadow: '0 12px 24px rgba(0,0,0,0.3)',
            zIndex: 1000
          }}>
            <Loader2 size={24} color="var(--accent-color)" style={{ animation: 'spin 1s linear infinite' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Analyzing Field Data</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Processing satellite imagery and running AI models...</p>
            </div>
            <style>
              {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
            </style>
          </div>
        )}
      </main>

      <GuidedTour
        activePage={activePage}
        analysisStarted={analysisStarted}
      />
    </div>
  );
}
