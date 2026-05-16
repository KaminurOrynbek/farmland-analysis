import React, { useEffect, useState } from 'react';
import Navbar from './components/layout/TopNavbar';
import ProjectsPage from './pages/ProjectsPage';
import LandingPage from './pages/LandingPage';
import AnalysisDetailsPage from './pages/AnalysisDetailsPage';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import WorkspacePage from './pages/WorkspacePage';
import AdminPanelPage from './pages/AdminPanelPage';
import TeamAccessPage from './pages/TeamAccessPage';

import {
  checkHealth,
  runAnalysis,
  saveField,
  fetchAnalysisStatus,
  fetchAnalysisHistory,
  fetchCurrentUser,
  logoutUser
} from './api/client';
import './styles.css';
import AppSidebar from './components/layout/MainSidebar';

const DEFAULT_ANALYSIS_RESULTS = {
  analysisId: null,
  status: 'idle',
  vegetationHealth: '—',
  healthDelta: '',
  cropType: '—',
  confidence: '—',
  analyzedArea: '—',
  fieldCount: 0,
  stressZonesCount: 0,
  stressAreaPercentage: 0,
  ndviValue: null,
  eviValue: null,
  riskLevel: '—',
  overallStatus: '—',
  assessment: null,
  recommendations: [],
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const buildAssessmentMessage = (assessment, fallbackMessage = '') => {
  const parts = [
    assessment?.summary,
    assessment?.vegetation_description,
    assessment?.stress_assessment,
    fallbackMessage
  ].filter(Boolean);

  return parts[0] || '';
};

const normalizeAnalysisResult = (item) => {
  const assessment = item?.assessment || {};
  const recommendations = Array.isArray(assessment.recommendations)
    ? assessment.recommendations
    : [];

  const riskLevel = item?.risk_level || 'Unknown';
  const overallStatus = assessment.overall_status || mapRiskToStatus(riskLevel);

  return {
    analysisId: item?.analysis_id || null,
    status: item?.status || 'DONE',
    vegetationHealth:
      item?.vegetation_health !== null && item?.vegetation_health !== undefined
        ? `${Math.round(item.vegetation_health)}%`
        : '—',
    healthDelta: '',
    cropType: item?.crop_type || 'Unknown crop',
    confidence:
      item?.confidence !== null && item?.confidence !== undefined
        ? `${(item.confidence * 100).toFixed(1)}%`
        : '—',
    analyzedArea:
      item?.area_ha !== null && item?.area_ha !== undefined
        ? `${Number(item.area_ha).toFixed(2)} ha`
        : 'Unknown',
    fieldCount: 1,
    stressZonesCount: item?.stress_zones_count || 0,
    stressAreaPercentage: item?.stress_area_percentage || 0,
    ndviValue:
      item?.ndvi_value !== null && item?.ndvi_value !== undefined
        ? Number(item.ndvi_value)
        : null,
    eviValue:
      item?.evi_value !== null && item?.evi_value !== undefined
        ? Number(item.evi_value)
        : null,
    riskLevel,
    overallStatus,
    assessment,
    recommendations,
    message: buildAssessmentMessage(assessment, item?.message || '')
  };
};

const mapRiskToStatus = (riskLevel) => {
  if (riskLevel === 'Low') return 'Healthy';
  if (riskLevel === 'Medium') return 'Warning';
  if (riskLevel === 'High') return 'Critical';
  return 'Unknown';
};

const buildFeatureCollectionFromField = (field) => ({
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: {
        id: field.id,
        field_id: field.id,
        name: field.name,
        area: field.area_ha || 0,
        role: field.role
      },
      geometry: field.geometry
    }
  ]
});

const buildSelectionFromAnalysis = (analysisItem, field = null) => ({
  type: 'Feature',
  properties: {
    id: field?.id || analysisItem?.field_id || null,
    field_id: field?.id || analysisItem?.field_id || null,
    name: field?.name || analysisItem?.field_name || 'Unnamed Field',
    area: field?.area_ha || analysisItem?.area_ha || 0,
    role: field?.role || null
  },
  geometry: field?.geometry || null
});

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
  const [isSessionReady, setIsSessionReady] = useState(false);

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

  const handleLogin = (user) => {
    localStorage.setItem('user', JSON.stringify(user));
    setSessionUser(user);
    setAppView('app');
    setActivePage('Home');
  };

  const handleUpdateUser = (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setSessionUser(updatedUser);
  };

  const handleLogout = () => {
    logoutUser();
    sessionStorage.removeItem('authRedirect');
    setSessionUser(null);
    setAppView('landing');
    setActivePage('Home');
  };

  const resetAnalysisState = () => {
    setAnalysisStarted(false);
    setAnalysisResults(DEFAULT_ANALYSIS_RESULTS);
    setLatestAnalysisAt(null);
  };

  const handleCreateProject = () => {
    setGeoJsonData(null);
    setGeoJsonMeta(null);
    setGeoJsonUploadResponse(null);
    setGeoJsonUploadError(null);
    setSelectedField(null);
    resetAnalysisState();
    handleNavigate('Workspace');
  };

  const handleNavigate = (page) => {
    if (page === 'Admin' && sessionUser?.role !== 'ADMIN') {
      return;
    }

    setActivePage(page);
  };

  const handleRunAnalysis = async () => {
    const fieldId = geoJsonUploadResponse?.data?.id;

    if (!fieldId) {
      alert('Please upload or draw a field first.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisStarted(true);

    try {
      const queuedJob = await runAnalysis(fieldId, '2023-05-01', '2023-08-30');
      const analysisId = queuedJob.analysis_id;

      setAnalysisResults((current) => ({
        ...current,
        analysisId,
        status: 'PROCESSING',
        message: 'Analysis has started. Satellite imagery, vegetation indices, and AI model are being processed.'
      }));

      let finalStatus = null;

      for (let attempt = 0; attempt < 60; attempt += 1) {
        const statusResponse = await fetchAnalysisStatus(analysisId);
        finalStatus = statusResponse;

        setAnalysisResults((current) => ({
          ...current,
          analysisId,
          status: statusResponse.status,
          message: statusResponse.stage || 'Processing analysis...'
        }));

        if (statusResponse.status === 'DONE' || statusResponse.progress === 100) {
          break;
        }

        if (statusResponse.status === 'FAILED') {
          throw new Error(statusResponse.error || 'Analysis failed on the server.');
        }

        await sleep(3000);
      }

      if (!finalStatus || (finalStatus.status !== 'DONE' && finalStatus.progress !== 100)) {
        throw new Error('Analysis is still processing. Please check the report history later.');
      }

      const historyResponse = await fetchAnalysisHistory();
      const completedAnalyses = (historyResponse.data || [])
        .filter((item) => item.status === 'DONE' && item.analysis_id === analysisId);

      const latestAnalysis = completedAnalyses[0];

      if (!latestAnalysis) {
        throw new Error('Analysis completed, but results were not found in history.');
      }

      const normalizedResult = normalizeAnalysisResult(latestAnalysis);

      setAnalysisResults(normalizedResult);
      setLatestAnalysisAt(latestAnalysis.analysis_date || new Date().toISOString());
      handleDataChanged();
      handleNavigate('Analysis Report');
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

      
      const field = response.data;

      const metadata = {
        id: field.id,
        field_id: field.id,
        name: field.name || 'Drawn Field',
        area: field.area_ha || 0,
        role: field.role
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

  const handleOpenField = (field) => {
    if (!field?.geometry) {
      alert('This field does not have valid geometry.');
      return;
    }

    resetAnalysisState();

    const featureCollection = buildFeatureCollectionFromField(field);

    setGeoJsonData(featureCollection);
    setSelectedField(featureCollection.features[0]);
    setGeoJsonMeta({
      name: `${field.name || 'Saved Field'}.geojson`,
      size: null
    });
    setGeoJsonUploadResponse({
      status: 'success',
      data: field
    });
    setGeoJsonUploadError(null);

    handleNavigate('Workspace');
  };

  const handleOpenAnalysis = (analysisItem, field) => {
    const normalized = normalizeAnalysisResult(analysisItem);

    setAnalysisStarted(true);
    setAnalysisResults(normalized);
    setLatestAnalysisAt(analysisItem.analysis_date || new Date().toISOString());
    setSelectedField(buildSelectionFromAnalysis(analysisItem, field));

    if (field?.geometry) {
      const featureCollection = buildFeatureCollectionFromField(field);
      setGeoJsonData(featureCollection);
      setGeoJsonMeta({
        name: `${field.name || 'Saved Field'}.geojson`,
        size: null
      });
      setGeoJsonUploadResponse({
        status: 'success',
        data: field
      });
      setGeoJsonUploadError(null);
    } else {
      setGeoJsonData(null);
      setGeoJsonMeta(null);
      setGeoJsonUploadResponse(null);
      setGeoJsonUploadError(null);
    }

    handleNavigate('Analysis Report');
  };

  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      const authRedirect = sessionStorage.getItem('authRedirect');

      sessionStorage.removeItem('authRedirect');

      if (!token) {
        if (isMounted) {
          setSessionUser(null);
          setAppView(authRedirect === 'auth' ? 'auth' : 'landing');
          setIsSessionReady(true);
        }
        return;
      }

      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (isMounted) {
            setSessionUser(parsedUser);
            setAppView('app');
          }
        } catch (error) {
          console.warn('Stored user payload could not be parsed.', error);
        }
      }

      try {
        const freshUser = await fetchCurrentUser();

        if (!isMounted) {
          return;
        }

        localStorage.setItem('user', JSON.stringify(freshUser));
        setSessionUser(freshUser);
        setAppView('app');
      } catch {
        if (!isMounted) {
          return;
        }

        if (!storedUser) {
          setSessionUser(null);
          setAppView(authRedirect === 'auth' ? 'auth' : 'landing');
        }
      } finally {
        if (isMounted) {
          setIsSessionReady(true);
        }
      }
    };

    initializeSession();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isSessionReady) {
    return (
      <div className="auth-page">
        <div className="auth-shell">
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center' }}>
            Restoring your session...
          </div>
        </div>
      </div>
    );
  }

 
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
        onLogin={handleLogin}
      />
    );
  }

  const renderPrivatePage = () => {
    switch (activePage) {
      case 'Workspace':
        return (
          <WorkspacePage
            user={sessionUser}
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
      case 'Analysis Report':
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
            user={sessionUser}
            onNavigate={handleNavigate}
            refreshKey={dataRefreshKey}
            onOpenField={handleOpenField}
            onOpenAnalysis={handleOpenAnalysis}
            onCreateProject={handleCreateProject}
          />
        );
      case 'Settings':
      case 'Profile':
        return (
          <ProfilePage
            user={sessionUser}
            onNavigate={handleNavigate}
            onLogout={handleLogout}
            onUpdateUser={handleUpdateUser}
            onOpenAdmin={sessionUser?.role === 'ADMIN' ? () => handleNavigate('Admin') : null}
            backendHealthy={backendHealthy}
          />
        );
      case 'Team / Access':
        return (
          <TeamAccessPage
            user={sessionUser}
            onNavigate={handleNavigate}
          />
        );
      case 'Admin':
        return (
          <AdminPanelPage
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
    <div className="dashboard-container dashboard-shell" style={{ flexDirection: 'row' }}>
      <AppSidebar
        activePage={activePage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        user={sessionUser}
      />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <Navbar
          activePage={activePage}
          onNavigate={handleNavigate}
          onLogout={handleLogout}
          user={sessionUser}
        />
        {renderPrivatePage()}
      </div>
    </div>
  );
}

export default App;
