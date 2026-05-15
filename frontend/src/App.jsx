import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import ProjectsPage from './pages/ProjectsPage';
import LandingPage from './pages/LandingPage';
import AnalysisDetailsPage from './pages/AnalysisDetailsPage';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import WorkspacePage from './pages/WorkspacePage';
import AdminDashboardPage from './pages/AdminDashboardPage';


import { checkHealth, runAnalysis, saveField } from './api';
import './styles.css';

const DEFAULT_ANALYSIS_RESULTS = {
  vegetationHealth: '—',
  healthDelta: '',
  cropType: '—',
  confidence: '—',
  analyzedArea: '—',
  fieldCount: 0,
  stressZonesCount: 0,
  ndviValue: 0,
  eviValue: 0,
  riskLevel: '—',
  message: ''
};

const enrichFeatureCollection = (featureCollection, metadata) => {
  if (!featureCollection?.features?.length) {
    return featureCollection;
  }

  return {
    ...featureCollection,
    features: featureCollection.features.map((feature, index) => (
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
};

function App() {
  const [geoJsonUploadResponse, setGeoJsonUploadResponse] = useState(null);
  const [geoJsonUploadError, setGeoJsonUploadError] = useState(null);
  const [backendHealthy, setBackendHealthy] = useState(false);
  const [isFetchingSatelliteData, setIsFetchingSatelliteData] = useState(false);

  // Analysis Simulation State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStarted, setAnalysisStarted] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(DEFAULT_ANALYSIS_RESULTS);
  const [latestAnalysisAt, setLatestAnalysisAt] = useState(null);

  // GeoJSON State
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [geoJsonMeta, setGeoJsonMeta] = useState(null);
  const [selectedField, setSelectedField] = useState(null);
  const [fieldLayerVisible, setFieldLayerVisible] = useState(true);

  const [appView, setAppView] = useState('landing');
  const [activePage, setActivePage] = useState('Home');
  const [sessionUser, setSessionUser] = useState(null);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);

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

  const handleDataChanged = () => {
    setDataRefreshKey((current) => current + 1);
  };

  const handleOpenAuth = () => {
    setAppView('auth');
  };

  const handleMockLogin = (user) => {
    setSessionUser(user);
    setAppView('app');
    setActivePage('Home');
  };

  const handleLogout = () => {
    setSessionUser(null);
    setAppView('landing');
    setActivePage('Home');
  };

  const handleNavigate = (page) => {
    if (page === 'Admin' && sessionUser?.role !== 'Administrator') {
      return;
    }

    setActivePage(page);
  };

  const handleRunAnalysis = async () => {
    // Prevent run if no field was successfully saved to the database
    if (!geoJsonUploadResponse?.data?.field_id) {
      alert('Please upload field boundaries first so they are saved to the database.');
      return;
    }

    setIsAnalyzing(true);
    try {
      // Use the actual generated PostgreSQL field UUID
      const fieldId = geoJsonUploadResponse.data.field_id;
      
      // Use our Clean Architecture use case which orchestrates GEE, Rasterio, DB and ResNet
      const data = await runAnalysis(fieldId, '2023-05-01', '2023-08-30');
      
      setAnalysisResults({
        vegetationHealth: `${data.vegetation_health}%`,
        healthDelta: data.risk_level === 'Low' ? '+1.2%' : '-0.5%',
        cropType: data.crop_type,
        confidence: `${(data.confidence * 100).toFixed(1)}%`,
        analyzedArea: data.analyzed_area ? `${data.analyzed_area.toFixed(2)} ha` : 'Unknown',
        fieldCount: 1,
        stressZonesCount: data.stress_zones_count,
        ndviValue: data.ndvi_value ? data.ndvi_value.toFixed(2) : 0,
        eviValue: data.evi_value ? data.evi_value.toFixed(2) : '—',
        riskLevel: data.risk_level,
        message: data.message
      });
      setAnalysisStarted(true);
      setLatestAnalysisAt(new Date().toISOString());
      handleDataChanged();
    } catch (error) {
      console.error('Analysis failed:', error);
      alert(`Analysis failed: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFetchSatelliteData = async () => {
    if (!geoJsonData) {
      alert('Please upload field boundaries first.');
      return;
    }
    
    // The imagery fetching is integrated within the "runAnalysis" pipeline 
    // in our clean architecture flow, but we can simulate the "success" indicator here
    // to give the user immediate feedback that their area is eligible for GEE data.
    setIsFetchingSatelliteData(true);
    setTimeout(() => {
      setIsFetchingSatelliteData(false);
      alert("Satellite data fetching is integrated securely into the Run Analysis pipeline (server-side GEE download). Click 'Run Analysis' to process.");
    }, 1500);
  };

  const handlePolygonDrawn = async (geoJsonFeatureCollection) => {
    try {
      const geometryToSave = geoJsonFeatureCollection.features[0].geometry;
      // Send geometry to PostgreSQL database via API
      const response = await saveField('Drawn Field', geometryToSave, 0.0);

      const metadata = {
        id: response.data.field_id,
        field_id: response.data.field_id,
        name: response.data.name || 'Drawn Field',
        area: 0.0
      };
      const enrichedFeatureCollection = enrichFeatureCollection(geoJsonFeatureCollection, metadata);
      
      // Update state identically to a file upload so the UI responds
      setGeoJsonUploadResponse(response);
      setSelectedField(enrichedFeatureCollection.features[0]);
      setGeoJsonData(enrichedFeatureCollection);
      setGeoJsonMeta({ name: 'Drawn Field.geojson', size: null });
      setGeoJsonUploadError(null);
      handleDataChanged();
      alert('Drawn field saved to the database. You can now click Run Analysis.');
    } catch (error) {
      console.error('Drawn field save error:', error);
      alert(`Failed to save drawn field: ${error.message}`);
    }
  };

  if (appView === 'landing') {
    return (
      <LandingPage
        onSignIn={handleOpenAuth}
        onGetStarted={handleOpenAuth}
      />
    );
  }

  if (appView === 'auth') {
    return (
      <AuthPage
        onBack={() => setAppView('landing')}
        onLogin={handleMockLogin}
      />
    );
  }

  const renderPrivatePage = () => {
    switch (activePage) {
      case 'Workspace':
        return (
          <WorkspacePage
            activePage={activePage}
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
            selectedField={selectedField}
            setSelectedField={setSelectedField}
            onPolygonDrawn={handlePolygonDrawn}
            analysisResults={analysisResults}
            analysisStarted={analysisStarted}
            onFieldSaved={handleDataChanged}
          />
        );
      case 'Analysis Details':
        return (
          <AnalysisDetailsPage
            analysisResults={analysisResults}
            selectedField={selectedField}
            analysisStarted={analysisStarted}
            latestAnalysisAt={latestAnalysisAt}
            onNavigate={handleNavigate}
          />
        );
      case 'Projects':
        return (
          <ProjectsPage
            onNavigate={handleNavigate}
            refreshKey={dataRefreshKey}
          />
        );
      case 'Profile':
        return (
          <ProfilePage
            user={sessionUser}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            onOpenAdmin={sessionUser?.role === 'Administrator' ? () => handleNavigate('Admin') : null}
            backendHealthy={backendHealthy}
          />
        );
      case 'Admin':
        return (
          <AdminDashboardPage
            refreshKey={dataRefreshKey}
            onNavigate={handleNavigate}
            backendHealthy={backendHealthy}
          />
        );
      case 'Home':
      default:
        return (
          <HomePage
            user={sessionUser}
            backendHealthy={backendHealthy}
            onNavigate={handleNavigate}
            refreshKey={dataRefreshKey}
            analysisResults={analysisResults}
            latestAnalysisAt={latestAnalysisAt}
          />
        );
    }
  };

  return (
    <div className="dashboard-container dashboard-shell">
      <Navbar
        backendHealthy={backendHealthy}
        activePage={activePage}
        onNavigate={handleNavigate}
        user={sessionUser}
      />
      {renderPrivatePage()}
    </div>
  );
}

export default App;
