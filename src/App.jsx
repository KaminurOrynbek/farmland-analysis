import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import AnalyticsPanel from './components/AnalyticsPanel';
import { checkHealth, runAnalysis } from './api';
import './styles.css';

function App() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadResponse, setUploadResponse] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [geoJsonUploadResponse, setGeoJsonUploadResponse] = useState(null);
  const [geoJsonUploadError, setGeoJsonUploadError] = useState(null);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);
  const [backendHealthy, setBackendHealthy] = useState(false);

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
      // Use "demo_image" if none uploaded, or the name if uploaded
      const imageId = uploadedImage ? uploadedImage.name : "demo_field_01";
      const data = await runAnalysis(imageId);
      
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

  return (
    <div className="dashboard-container">
      <Navbar backendHealthy={backendHealthy} />
      <div className="dashboard-content">
        <Sidebar 
          uploadedImage={uploadedImage} 
          setUploadedImage={setUploadedImage}
          uploadResponse={uploadResponse}
          setUploadResponse={setUploadResponse}
          uploadError={uploadError}
          setUploadError={setUploadError}
          overlayVisible={overlayVisible}
          setOverlayVisible={setOverlayVisible}
          overlayOpacity={overlayOpacity}
          setOverlayOpacity={setOverlayOpacity}
          isAnalyzing={isAnalyzing}
          onRunAnalysis={handleRunAnalysis}
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
            uploadedImage={uploadedImage}
            overlayVisible={overlayVisible}
            overlayOpacity={overlayOpacity}
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
