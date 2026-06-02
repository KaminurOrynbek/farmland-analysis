import React, { useEffect, useState } from 'react';
import Navbar from './components/layout/AppHeader';
import ProjectsPage from './pages/ProjectsOverviewPage';
import LandingPage from './pages/LandingPage';
import AnalysisDetailsPage from './pages/FieldReportPage.jsx';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import WorkspacePage from './pages/WorkspacePage';
import AdminPanelPage from './pages/AdminPanelPage';
import TeamAccessPage from './pages/FieldAccessPage';

import {
  checkHealth,
  runAnalysis,
  saveField,
  fetchSatelliteData,
  fetchAnalysisStatus,
  fetchAnalysisHistory,
  fetchCurrentUser,
  subscribeToAnalysisUpdates,
  logoutUser
} from './api/client';
import './styles.css';
import AppSidebar from './components/layout/AppSidebar';
import { computeBboxFromGeoJson } from './utils/geoUtils.js';
import { getSavedFieldId } from './utils/fieldIdentity';

const DEFAULT_ANALYSIS_RESULTS = {
  analysisId: null,
  status: 'idle',
  vegetationHealth: '—',
  healthDelta: '',
  cropType: '—',
  confidence: '—',
  analyzedArea: '—',
  analyzedAreaHectares: null,
  fieldCount: 0,
  stressZonesCount: 0,
  stressAreaPercentage: 0,
  ndviValue: null,
  eviValue: null,
  riskLevel: '—',
  overallStatus: 'Unknown',
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

const applyAnalysisStatusUpdate = (setAnalysisResults, analysisId, statusResponse) => {
  setAnalysisResults((current) => ({
    ...current,
    analysisId,
    status: statusResponse?.status || current.status,
    message: statusResponse?.stage || 'Processing analysis...'
  }));
};

const isAnalysisFinished = (statusResponse) => (
  statusResponse?.status === 'DONE' ||
  statusResponse?.status === 'FAILED' ||
  statusResponse?.progress === 100
);

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
    analyzedAreaHectares:
      item?.area_ha !== null && item?.area_ha !== undefined
        ? Number(item.area_ha)
        : null,
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

const getCurrentFieldId = ({ geoJsonUploadResponse }) => (
  getSavedFieldId(geoJsonUploadResponse)
);

const buildWorkspaceFieldKey = ({
  geoJsonData,
  selectedField,
  geoJsonUploadResponse
}) => {
  const savedFieldId = getCurrentFieldId({ geoJsonUploadResponse });

  if (savedFieldId) {
    return `field:${savedFieldId}`;
  }

  const geometry =
    selectedField?.geometry ||
    geoJsonData?.features?.[0]?.geometry ||
    null;

  if (!geometry) {
    return null;
  }

  return `geometry:${JSON.stringify(geometry)}`;
};

const WORKSPACE_GUIDE_PENDING_KEY = 'workspaceGuidePendingAfterRegistration';
const isAdminUser = (user) => user?.role === 'ADMIN';

const normalizePageId = (page) => {
  if (page === 'Home') return 'Dashboard';
  if (page === 'Projects') return 'My Farm';
  if (page === 'Reports') return 'Analysis Report';
  if (page === 'Team / Access' || page === 'Field Access') return 'Field Sharing';
  if (page === 'Profile') return 'Settings';
  if (page === 'Admin') return 'Admin Panel';
  return page;
};

const getDefaultPrivatePage = (user) => (
  isAdminUser(user) ? 'Dashboard' : 'My Farm'
);

const getAccessiblePage = (page, user) => {
  const normalizedPage = normalizePageId(page);

  if (normalizedPage === 'Dashboard' && !isAdminUser(user)) {
    return 'My Farm';
  }

  if (normalizedPage === 'Admin Panel' && !isAdminUser(user)) {
    return getDefaultPrivatePage(user);
  }

  return normalizedPage;
};

function App() {
  const [geoJsonUploadResponse, setGeoJsonUploadResponse] = useState(null);
  const [geoJsonUploadError, setGeoJsonUploadError] = useState(null);
  const [backendHealthy, setBackendHealthy] = useState(false);
  const [isFetchingSatelliteData, setIsFetchingSatelliteData] = useState(false);
  const [isSavingField, setIsSavingField] = useState(false);
  const [pendingDrawnField, setPendingDrawnField] = useState(null);
  const [fieldNameDraft, setFieldNameDraft] = useState('');
  const [satelliteFetchResult, setSatelliteFetchResult] = useState(null);
  const [satelliteFetchError, setSatelliteFetchError] = useState(null);

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
  const [activePage, setActivePage] = useState('Dashboard');
  const [sessionUser, setSessionUser] = useState(null);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isGuidedTourOpen, setIsGuidedTourOpen] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState('2026');

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
    const shouldOpenGuidedTour =
      sessionStorage.getItem(WORKSPACE_GUIDE_PENDING_KEY) === 'true';

    sessionStorage.removeItem(WORKSPACE_GUIDE_PENDING_KEY);
    localStorage.setItem('user', JSON.stringify(user));
    setSessionUser(user);
    setAppView('app');
    setActivePage(shouldOpenGuidedTour ? 'Workspace' : getDefaultPrivatePage(user));
    setIsGuidedTourOpen(false);
  };

  const handleRegisterSuccess = () => {
    sessionStorage.setItem(WORKSPACE_GUIDE_PENDING_KEY, 'true');
  };

  const handleUpdateUser = (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setSessionUser(updatedUser);
  };

  const handleLogout = () => {
    logoutUser();
    sessionStorage.removeItem('authRedirect');
    sessionStorage.removeItem(WORKSPACE_GUIDE_PENDING_KEY);
    setSessionUser(null);
    setAppView('landing');
    setActivePage('Dashboard');
    setIsGuidedTourOpen(false);
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
    setPendingDrawnField(null);
    setFieldNameDraft('');
    resetAnalysisState();
    handleNavigate('Workspace');
  };

  const handleNavigate = (page) => {
    const normalizedPage = normalizePageId(page);

    if (normalizedPage === 'Admin Panel' && !isAdminUser(sessionUser)) {
      return;
    }

    const nextPage = getAccessiblePage(normalizedPage, sessionUser);

    if (nextPage !== 'Workspace') {
      setIsGuidedTourOpen(false);
    }

    setActivePage(nextPage);
  };

  const handleOpenGuidedTour = () => {
    setActivePage('Workspace');
    setIsGuidedTourOpen(true);
  };

  const handleCloseGuidedTour = () => {
    setIsGuidedTourOpen(false);
  };

  const handleRunAnalysis = async () => {
    const fieldId = getCurrentFieldId({ geoJsonUploadResponse });

    if (!fieldId) {
      alert('Please save or open a field before running analysis.');
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
      let latestSocketStatus = null;
      let lastConsumedSocketStatus = null;

      const unsubscribeFromAnalysisUpdates = subscribeToAnalysisUpdates(sessionUser?.id, {
        onMessage: (statusUpdate) => {
          if (String(statusUpdate?.analysis_id) !== String(analysisId)) {
            return;
          }

          latestSocketStatus = statusUpdate;
          applyAnalysisStatusUpdate(setAnalysisResults, analysisId, statusUpdate);
        }
      });

      try {
        for (let attempt = 0; attempt < 60; attempt += 1) {
          if (latestSocketStatus && latestSocketStatus !== lastConsumedSocketStatus) {
            finalStatus = latestSocketStatus;
            lastConsumedSocketStatus = latestSocketStatus;

            if (finalStatus.status === 'FAILED') {
              throw new Error(finalStatus.error || 'Analysis failed on the server.');
            }

            if (isAnalysisFinished(finalStatus)) {
              break;
            }

            await sleep(1500);
            continue;
          }

          const statusResponse = await fetchAnalysisStatus(analysisId);
          finalStatus = statusResponse;
          applyAnalysisStatusUpdate(setAnalysisResults, analysisId, statusResponse);

          if (statusResponse.status === 'FAILED') {
            throw new Error(statusResponse.error || 'Analysis failed on the server.');
          }

          if (isAnalysisFinished(statusResponse)) {
            break;
          }

          await sleep(3000);
        }
      } finally {
        unsubscribeFromAnalysisUpdates();
      }

      if (!finalStatus || finalStatus.status === 'FAILED') {
        throw new Error(finalStatus?.error || 'Analysis failed on the server.');
      }

      if (!isAnalysisFinished(finalStatus)) {
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
    } catch (error) {
      console.error('Analysis failed:', error);
      alert(`Analysis failed: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };
  

  const handleFetchSatelliteData = async (dataset = 'sentinel2') => {
    if (!geoJsonData) {
      alert('Please upload field boundaries first.');
      return;
    }

    const bbox = computeBboxFromGeoJson(geoJsonData);
    const currentFieldKey = buildWorkspaceFieldKey({
      geoJsonData,
      selectedField,
      geoJsonUploadResponse
    });

    if (!bbox || !currentFieldKey) {
      alert('The current field geometry is missing valid coordinates.');
      return;
    }

    setIsFetchingSatelliteData(true);
    setSatelliteFetchError(null);

    try {
      const metadata = await fetchSatelliteData({
        dataset,
        bbox
      });

      setSatelliteFetchResult({
        fieldKey: currentFieldKey,
        data: metadata
      });
    } catch (error) {
      setSatelliteFetchError({
        fieldKey: currentFieldKey,
        message: error.response?.data?.detail || 'Failed to fetch satellite metadata.'
      });
    } finally {
      setIsFetchingSatelliteData(false);
    }
  };

  const saveFieldFeatureCollection = async (fieldName, featureCollection) => {
    const trimmedFieldName = fieldName.trim();
    const geometryToSave = featureCollection?.features?.[0]?.geometry;

    if (!trimmedFieldName) {
      alert('Please enter a field name before saving.');
      return false;
    }

    if (!geometryToSave) {
      alert('Please upload or draw a field first.');
      return false;
    }

    setIsSavingField(true);

    try {
      const response = await saveField(trimmedFieldName, geometryToSave, 0.0);
      const field = response.data;

      const metadata = {
        id: field.id,
        field_id: field.id,
        name: field.name || trimmedFieldName,
        area: field.area_ha || 0,
        role: field.role
      };
      const enrichedFeatureCollection = enrichFeatureCollection(featureCollection, metadata);

      setGeoJsonUploadResponse(response);
      setSelectedField(enrichedFeatureCollection.features[0]);
      setGeoJsonData(enrichedFeatureCollection);
      setGeoJsonMeta((current) => ({
        name: field.name || trimmedFieldName,
        size: current?.size ?? null
      }));
      setGeoJsonUploadError(null);
      setPendingDrawnField(null);
      setFieldNameDraft(field.name || trimmedFieldName);
      handleDataChanged();
      return true;
    } catch (error) {
      console.error('Field save error:', error);
      setGeoJsonUploadError(error.response?.data?.detail || 'Backend database validation failed.');
      alert(`Failed to save field: ${error.response?.data?.detail || error.message}`);
      return false;
    } finally {
      setIsSavingField(false);
    }
  };

  const handlePolygonDrawn = (geoJsonFeatureCollection) => {
    const previousState = {
      geoJsonData,
      geoJsonMeta,
      geoJsonUploadResponse,
      geoJsonUploadError,
      selectedField,
      fieldNameDraft
    };

    setPendingDrawnField({
      featureCollection: geoJsonFeatureCollection,
      previousState
    });
    setGeoJsonData(geoJsonFeatureCollection);
    setSelectedField(geoJsonFeatureCollection.features[0] || null);
    setGeoJsonMeta({ name: 'Manual drawing', size: null });
    setGeoJsonUploadResponse(null);
    setGeoJsonUploadError(null);
    setFieldNameDraft('');
  };

  const handleSaveUploadedField = async (fieldName) => saveFieldFeatureCollection(fieldName, geoJsonData);

  const handleSaveDrawnField = async (fieldName) => {
    if (!pendingDrawnField?.featureCollection) {
      return false;
    }

    return saveFieldFeatureCollection(fieldName, pendingDrawnField.featureCollection);
  };

  const handleCancelDrawnField = () => {
    if (!pendingDrawnField?.previousState) {
      return;
    }

    setGeoJsonData(pendingDrawnField.previousState.geoJsonData);
    setGeoJsonMeta(pendingDrawnField.previousState.geoJsonMeta);
    setGeoJsonUploadResponse(pendingDrawnField.previousState.geoJsonUploadResponse);
    setGeoJsonUploadError(pendingDrawnField.previousState.geoJsonUploadError);
    setSelectedField(pendingDrawnField.previousState.selectedField);
    setFieldNameDraft(pendingDrawnField.previousState.fieldNameDraft);
    setPendingDrawnField(null);
  };

  const handleOpenField = (field, latestAnalysis = null, options = {}) => {
    const { navigate = true } = options;

    if (!field?.geometry) {
      alert('This field does not have valid geometry.');
      return;
    }

    setPendingDrawnField(null);

    const featureCollection = buildFeatureCollectionFromField(field);

    setGeoJsonData(featureCollection);
    setSelectedField(featureCollection.features[0]);
    setGeoJsonMeta({
      name: field.name || 'Saved Field',
      size: null
    });
    setFieldNameDraft(field.name || 'Saved Field');
    setGeoJsonUploadResponse({
      status: 'success',
      data: field
    });
    setGeoJsonUploadError(null);

    if (latestAnalysis?.analysis_id) {
      const normalized = normalizeAnalysisResult(latestAnalysis);
      setAnalysisStarted(true);
      setAnalysisResults(normalized);
      setLatestAnalysisAt(latestAnalysis.analysis_date || new Date().toISOString());
    } else {
      resetAnalysisState();
    }

    if (navigate) {
      handleNavigate('Workspace');
    }
  };

  const handleOpenAnalysis = (analysisItem, field) => {
    const normalized = normalizeAnalysisResult(analysisItem);

    setAnalysisStarted(true);
    setAnalysisResults(normalized);
    setLatestAnalysisAt(analysisItem.analysis_date || new Date().toISOString());
    setSelectedField(buildSelectionFromAnalysis(analysisItem, field));
    setPendingDrawnField(null);

    if (field?.geometry) {
      const featureCollection = buildFeatureCollectionFromField(field);
      setGeoJsonData(featureCollection);
      setGeoJsonMeta({
        name: field.name || 'Saved Field',
        size: null
      });
      setFieldNameDraft(field.name || 'Saved Field');
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
      setFieldNameDraft('');
    }

    handleNavigate('Analysis Report');
  };

  const handleRunNewAnalysisFromReport = async () => {
    handleNavigate('Workspace');
    await handleRunAnalysis();
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

  const effectiveActivePage = isSessionReady
    ? getAccessiblePage(activePage, sessionUser)
    : activePage;

  useEffect(() => {
    if (isSessionReady && activePage !== effectiveActivePage) {
      setActivePage(effectiveActivePage);
    }
  }, [activePage, effectiveActivePage, isSessionReady]);

  const currentFieldId = getCurrentFieldId({ geoJsonUploadResponse });

  const currentWorkspaceFieldKey = buildWorkspaceFieldKey({
    geoJsonData,
    selectedField,
    geoJsonUploadResponse
  });

  const currentSatelliteFetchResult =
    satelliteFetchResult?.fieldKey === currentWorkspaceFieldKey
      ? satelliteFetchResult.data
      : null;

  const currentSatelliteFetchError =
    satelliteFetchError?.fieldKey === currentWorkspaceFieldKey
      ? satelliteFetchError.message
      : null;

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
        onRegistered={handleRegisterSuccess}
      />
    );
  }

  const renderPrivatePage = () => {
    switch (effectiveActivePage) {
      case 'Workspace':
        return (
          <WorkspacePage
            user={sessionUser}
            activePage={effectiveActivePage}
            refreshKey={dataRefreshKey}
            backendHealthy={backendHealthy}
            isAnalyzing={isAnalyzing}
            onRunAnalysis={handleRunAnalysis}
            isFetchingSatelliteData={isFetchingSatelliteData}
            onFetchSatelliteData={handleFetchSatelliteData}
            satelliteFetchResult={currentSatelliteFetchResult}
            satelliteFetchError={currentSatelliteFetchError}
            geoJsonData={geoJsonData}
            setGeoJsonData={setGeoJsonData}
            geoJsonMeta={geoJsonMeta}
            setGeoJsonMeta={setGeoJsonMeta}
            geoJsonUploadResponse={geoJsonUploadResponse}
            setGeoJsonUploadResponse={setGeoJsonUploadResponse}
            geoJsonUploadError={geoJsonUploadError}
            setGeoJsonUploadError={setGeoJsonUploadError}
            fieldName={fieldNameDraft}
            setFieldName={setFieldNameDraft}
            fieldLayerVisible={fieldLayerVisible}
            setFieldLayerVisible={setFieldLayerVisible}
            selectedField={selectedField}
            setSelectedField={setSelectedField}
            onPolygonDrawn={handlePolygonDrawn}
            onSaveField={handleSaveUploadedField}
            isSavingField={isSavingField}
            isDrawFieldNamingOpen={Boolean(pendingDrawnField)}
            onSaveDrawnField={handleSaveDrawnField}
            onCancelDrawnField={handleCancelDrawnField}
            currentFieldId={currentFieldId}
            analysisResults={analysisResults}
            analysisStarted={analysisStarted}
            latestAnalysisAt={latestAnalysisAt}
            selectedSeason={selectedSeason}
            onChangeSeason={setSelectedSeason}
            onOpenField={handleOpenField}
            onOpenAnalysis={handleOpenAnalysis}
            onOpenReport={() => handleNavigate('Analysis Report')}
            isGuidedTourOpen={isGuidedTourOpen}
            onCloseGuidedTour={handleCloseGuidedTour}
          />
        );
      case 'Analysis Report':
        return (
          <AnalysisDetailsPage
            user={sessionUser}
            backendHealthy={backendHealthy}
            analysisResults={analysisResults}
            selectedField={selectedField}
            setSelectedField={setSelectedField}
            geoJsonData={geoJsonData}
            fieldLayerVisible={fieldLayerVisible}
            analysisStarted={analysisStarted}
            latestAnalysisAt={latestAnalysisAt}
            selectedSeason={selectedSeason}
            onChangeSeason={setSelectedSeason}
            onNavigate={handleNavigate}
            onRunNewAnalysis={handleRunNewAnalysisFromReport}
            onOpenAnalysis={handleOpenAnalysis}
            refreshKey={dataRefreshKey}
          />
        );
      case 'My Farm':
        return (
          <ProjectsPage
            user={sessionUser}
            backendHealthy={backendHealthy}
            selectedSeason={selectedSeason}
            onChangeSeason={setSelectedSeason}
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
            onOpenAdmin={sessionUser?.role === 'ADMIN' ? () => handleNavigate('Admin Panel') : null}
            backendHealthy={backendHealthy}
          />
        );
      case 'Field Sharing':
        return (
          <TeamAccessPage
            user={sessionUser}
            onNavigate={handleNavigate}
          />
        );
      case 'Admin Panel':
        return (
          <AdminPanelPage
            refreshKey={dataRefreshKey}
            onNavigate={handleNavigate}
            backendHealthy={backendHealthy}
          />
        );
      case 'Dashboard':
      case 'Home':
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
      default:
        return isAdminUser(sessionUser) ? (
          <HomePage
            user={sessionUser}
            backendHealthy={backendHealthy}
            onNavigate={handleNavigate}
            refreshKey={dataRefreshKey}
            analysisResults={analysisResults}
            latestAnalysisAt={latestAnalysisAt}
          />
        ) : (
          <ProjectsPage
            user={sessionUser}
            backendHealthy={backendHealthy}
            selectedSeason={selectedSeason}
            onChangeSeason={setSelectedSeason}
            onNavigate={handleNavigate}
            refreshKey={dataRefreshKey}
            onOpenField={handleOpenField}
            onOpenAnalysis={handleOpenAnalysis}
            onCreateProject={handleCreateProject}
          />
        );
    }
  };

  return (
    <div className="dashboard-container dashboard-shell" style={{ flexDirection: 'row' }}>
      <AppSidebar
        activePage={effectiveActivePage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        user={sessionUser}
      />
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
        <Navbar
          activePage={effectiveActivePage}
          onNavigate={handleNavigate}
          onOpenGuidedTour={handleOpenGuidedTour}
          onLogout={handleLogout}
          user={sessionUser}
        />
        {renderPrivatePage()}
      </div>
    </div>
  );
}

export default App;
