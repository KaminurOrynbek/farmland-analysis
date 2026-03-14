import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import AnalyticsPanel from './components/AnalyticsPanel';
import './styles.css';

function App() {
  const [uploadedImage, setUploadedImage] = useState(null);
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [overlayOpacity, setOverlayOpacity] = useState(0.7);

  // Analysis Simulation State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [analysisResults, setAnalysisResults] = useState({
    vegetationHealth: "84.2%",
    healthDelta: "+2.4%",
    cropType: "Winter Wheat",
    confidence: "96.8%",
    analyzedArea: "142.5 ha",
    fieldCount: 12,
    stressZonesCount: 3,
    ndviValue: 0.72
  });

  // GeoJSON State
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [geoJsonMeta, setGeoJsonMeta] = useState(null); // stores name and size for display
  const [selectedField, setSelectedField] = useState(null);
  const [fieldLayerVisible, setFieldLayerVisible] = useState(true);

  const handleRunAnalysis = () => {
    setIsAnalyzing(true);
    
    // Simulate 1.8s deep learning inference latency
    setTimeout(() => {
      setAnalysisResults({
        vegetationHealth: (Math.random() * (89 - 81) + 81).toFixed(1) + "%",
        healthDelta: "+" + (Math.random() * 3).toFixed(1) + "%",
        cropType: Math.random() > 0.5 ? "Winter Wheat" : "Spring Barley",
        confidence: (Math.random() * (99 - 92) + 92).toFixed(1) + "%",
        analyzedArea: (Math.random() * (150 - 135) + 135).toFixed(1) + " ha",
        fieldCount: Math.floor(Math.random() * 5) + 10,
        stressZonesCount: Math.floor(Math.random() * 4) + 1,
        ndviValue: parseFloat((Math.random() * (0.85 - 0.65) + 0.65).toFixed(2))
      });
      setIsAnalyzing(false);
      setAnalysisStarted(true);
    }, 1800);
  };

  return (
    <div className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <Sidebar 
          uploadedImage={uploadedImage} 
          setUploadedImage={setUploadedImage}
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
