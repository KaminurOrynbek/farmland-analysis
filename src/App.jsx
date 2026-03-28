import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import AnalyticsPanel from './components/AnalyticsPanel';
import { checkHealth, runAnalysis } from './api';
import './styles.css';

function App() {
  const [geoJsonUploadResponse, setGeoJsonUploadResponse] = useState(null);
  const [geoJsonUploadError, setGeoJsonUploadError] = useState(null);
  const [backendHealthy, setBackendHealthy] = useState(false);
  const [isFetchingSatelliteData, setIsFetchingSatelliteData] = useState(false);

  // Analysis Simulation State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [analysisResults, setAnalysisResults] = useState({
    vegetationHealth: "—",
    healthDelta: "",
    cropType: "—",
    confidence: "—",
    analyzedArea: "—",
    fieldCount: 0,
    stressZonesCount: 0,
    ndviValue: 0,
    riskLevel: "—"
  });

  // GeoJSON State
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [geoJsonMeta, setGeoJsonMeta] = useState(null); // stores name and size for display
  const [selectedField, setSelectedField] = useState(null);
  const [fieldLayerVisible, setFieldLayerVisible] = useState(true);

  // Health check on load
  useEffect(() => {
    const verifyBackend = async () => {
      const isHealthy = await checkHealth();
      setBackendHealthy(isHealthy);
    };
    verifyBackend();
    
    // Optional: periodic health check every 30s
    const interval = setInterval(verifyBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    
    try {
      // For geospatial workflow, we'll use the selected field's ID or a default
      const fieldId = selectedField?.properties?.id || "demo_field_01";
      const data = await runAnalysis(fieldId);
      
      setAnalysisResults({
        vegetationHealth: data.vegetation_health + "%",
        healthDelta: data.risk_level === 'Low' ? "+1.2%" : "-0.5%", // Dynamic mock delta
        cropType: data.crop_type,
        confidence: (data.confidence * 100).toFixed(1) + "%",
        analyzedArea: data.analyzed_area + " ha",
        fieldCount: 1, // API currently doesn't return count, assume 1 image
        stressZonesCount: data.stress_zones_count,
        ndviValue: data.ndvi_value,
        riskLevel: data.risk_level
      });
      setAnalysisStarted(true);
    } catch (error) {
      console.error("Analysis failed", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFetchSatelliteData = async () => {
    if (!geoJsonData) {
      alert("Please upload field boundaries first.");
      return;
    }
    setIsFetchingSatelliteData(true);
    // Placeholder for future /api/fetch-satellite-data
    setTimeout(() => {
      setIsFetchingSatelliteData(false);
      alert("Satellite data successfully retrieved for the defined area.");
    }, 2000);
  };

  return (
    <div className="dashboard-container">
      <Navbar backendHealthy={backendHealthy} />
      <div className="dashboard-content">
        <Sidebar 
          isAnalyzing={isAnalyzing}
          onRunAnalysis={handleRunAnalysis}
          isFetchingSatelliteData={isFetchingSatelliteData}
          onFetchSatelliteData={handleFetchSatelliteData}
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
        />
        <main className="map-container">
          <MapView 
            analysisStarted={analysisStarted}
            isAnalyzing={isAnalyzing}
            geoJsonData={geoJsonData}
            selectedField={selectedField}
            setSelectedField={setSelectedField}
            fieldLayerVisible={fieldLayerVisible}
          />
        </main>
        <AnalyticsPanel 
          analysisResults={analysisResults}
          isAnalyzing={isAnalyzing}
          selectedField={selectedField}
        />
      </div>
    </div>
  );
}

export default App;
