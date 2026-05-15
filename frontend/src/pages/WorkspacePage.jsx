import React from 'react';
import AnalyticsPanel from '../components/AnalyticsPanel';
import GuidedTour from '../components/GuidedTour';
import MapView from '../components/MapView';
import Sidebar from '../components/Sidebar';

export default function WorkspacePage({
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
    <div className="dashboard-content workspace-shell">
      <Sidebar
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

      <main className="map-container">
        <MapView
          analysisStarted={analysisStarted}
          isAnalyzing={isAnalyzing}
          geoJsonData={geoJsonData}
          selectedField={selectedField}
          setSelectedField={setSelectedField}
          fieldLayerVisible={fieldLayerVisible}
          onPolygonDrawn={onPolygonDrawn}
          analysisResults={analysisResults}
        />
      </main>

      <AnalyticsPanel
        analysisResults={analysisResults}
        isAnalyzing={isAnalyzing}
        selectedField={selectedField}
      />

      <GuidedTour
        activePage={activePage}
        analysisStarted={analysisStarted}
      />
    </div>
  );
}
