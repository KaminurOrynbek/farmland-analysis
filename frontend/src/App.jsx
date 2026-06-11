import React, { useEffect, useState } from 'react';
import AppHeader from './components/layout/AppHeader';
import FieldsPage from './pages/FieldsPage.jsx';
import LandingPage from './pages/LandingPage';
import AnalysisResultsPage from './pages/AnalysisResultsPage.jsx';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/ProfilePage';
import WorkspacePage from './pages/WorkspacePage';
import AdminPanelPage from './pages/AdminPanelPage';
import FieldSharingPage from './pages/FieldAccessPage';

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
import {
  APP_PAGES,
  getAccessiblePage,
  getDefaultPrivatePage,
  isAdminUser
} from './constants/appPages';
import { computeBboxFromGeoJson } from './utils/geoUtils.js';
import { getSavedFieldId } from './utils/fieldIdentity';
import {
  createEmptyAnalysisRecord,
  createSeasonSelection,
  getCurrentSeasonYear,
  normalizeAnalysisRecord
} from './utils/fieldAnalysisUtils';

const DEFAULT_ANALYSIS_RESULTS = createEmptyAnalysisRecord();

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
        role: field.role,
        crop_type: field.crop_type || null,
        planting_date: field.planting_date || null,
        season_year: field.season_year || null
      },
      geometry: field.geometry
    }
  ]
});

const buildSelectionFromAnalysis = (analysisItem, field = null) => ({
  type: 'Feature',
  properties: {
    id: field?.id || analysisItem?.field_id || analysisItem?.fieldId || null,
    field_id: field?.id || analysisItem?.field_id || analysisItem?.fieldId || null,
    name: field?.name || analysisItem?.field_name || analysisItem?.fieldName || 'Unnamed Field',
    area: field?.area_ha || analysisItem?.area_ha || analysisItem?.areaHectares || 0,
    role: field?.role || null,
    crop_type: field?.crop_type || analysisItem?.field_metadata?.crop_type || analysisItem?.fieldMetadata?.cropType || null,
    planting_date: field?.planting_date || analysisItem?.field_metadata?.planting_date || analysisItem?.fieldMetadata?.plantingDate || null,
    season_year: field?.season_year || analysisItem?.season_year || analysisItem?.seasonYear || null
  },
  geometry: field?.geometry || null
});

const getSeasonSelectionFromRecord = (record) => {
  const seasonYear = String(record?.seasonYear || record?.season_year || getCurrentSeasonYear());
  const startDate = record?.startDate || record?.start_date || null;
  const endDate = record?.endDate || record?.end_date || null;

  if (!startDate || !endDate) {
    return createSeasonSelection(seasonYear, { seasonYear });
  }

  const expectedStart = `${seasonYear}-01-01`;
  const expectedEnd = `${seasonYear}-12-31`;
  const mode =
    startDate === expectedStart && endDate === expectedEnd
      ? seasonYear
      : 'custom';

  return createSeasonSelection(mode, {
    seasonYear,
    startDate,
    endDate
  });
};

const getCurrentFieldId = ({ geoJsonUploadResponse }) => (
  getSavedFieldId(geoJsonUploadResponse)
);

const buildWorkspaceFieldKey = ({
  geoJsonData,
  selectedField,
  geoJsonUploadResponse,
  seasonSelection
}) => {
  const savedFieldId = getCurrentFieldId({ geoJsonUploadResponse });
  const seasonKey = `${seasonSelection?.seasonYear || 'season'}:${seasonSelection?.startDate || 'start'}:${seasonSelection?.endDate || 'end'}`;

  if (savedFieldId) {
    return `field:${savedFieldId}:${seasonKey}`;
  }

  const geometry =
    selectedField?.geometry ||
    geoJsonData?.features?.[0]?.geometry ||
    null;

  if (!geometry) {
    return null;
  }

  return `geometry:${JSON.stringify(geometry)}:${seasonKey}`;
};

const WORKSPACE_GUIDE_PENDING_KEY = 'workspaceGuidePendingAfterRegistration';
const THEME_STORAGE_KEY = 'agrovisionTheme';

const getInitialTheme = () => {
  if (typeof window === 'undefined') {
    return 'dark';
  }

  const savedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme;
  }

  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
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
  const [activePage, setActivePage] = useState(APP_PAGES.DASHBOARD);
  const [sessionUser, setSessionUser] = useState(null);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const [isGuidedTourOpen, setIsGuidedTourOpen] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(getCurrentSeasonYear());
  const [seasonSelection, setSeasonSelection] = useState(
    createSeasonSelection(getCurrentSeasonYear())
  );
  const [fieldCropTypeDraft, setFieldCropTypeDraft] = useState('');
  const [fieldPlantingDateDraft, setFieldPlantingDateDraft] = useState('');
  const [theme, setTheme] = useState(getInitialTheme);

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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const handleDataChanged = () => {
    setDataRefreshKey((current) => current + 1);
  };

  const handleOpenAuth = () => {
    setAppView('auth');
  };

  const handleToggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'light' ? 'dark' : 'light'));
  };

  const handleLogin = (user) => {
    const shouldOpenGuidedTour =
      sessionStorage.getItem(WORKSPACE_GUIDE_PENDING_KEY) === 'true';

    sessionStorage.removeItem(WORKSPACE_GUIDE_PENDING_KEY);
    localStorage.setItem('user', JSON.stringify(user));
    setSessionUser(user);
    setAppView('app');
    setActivePage(
      shouldOpenGuidedTour ? APP_PAGES.WORKSPACE : getDefaultPrivatePage(user)
    );
    setIsGuidedTourOpen(false);
  };

  const handleRegisterSuccess = () => {
    sessionStorage.setItem(WORKSPACE_GUIDE_PENDING_KEY, 'true');
  };

  const handleUpdateUser = (updatedUser) => {
    localStorage.setItem('user', JSON.stringify(updatedUser));
    setSessionUser(updatedUser);
  };

  const resetSessionWorkspaceState = () => {
    setGeoJsonUploadResponse(null);
    setGeoJsonUploadError(null);
    setPendingDrawnField(null);
    setFieldNameDraft('');
    setFieldCropTypeDraft('');
    setFieldPlantingDateDraft('');

    setSatelliteFetchResult(null);
    setSatelliteFetchError(null);
    setIsFetchingSatelliteData(false);
    setIsSavingField(false);

    setIsAnalyzing(false);
    setAnalysisStarted(false);
    setAnalysisResults(createEmptyAnalysisRecord());
    setLatestAnalysisAt(null);

    setGeoJsonData(null);
    setGeoJsonMeta(null);
    setSelectedField(null);
    setFieldLayerVisible(true);

    setSelectedSeason(getCurrentSeasonYear());
    setSeasonSelection(createSeasonSelection(getCurrentSeasonYear()));
  };

  const handleLogout = () => {
    logoutUser();
    resetSessionWorkspaceState();

    sessionStorage.removeItem('authRedirect');
    sessionStorage.removeItem(WORKSPACE_GUIDE_PENDING_KEY);

    setSessionUser(null);
    setAppView('landing');
    setActivePage(APP_PAGES.DASHBOARD);
    setIsGuidedTourOpen(false);
    setDataRefreshKey((current) => current + 1);
  };

  const resetAnalysisState = () => {
    setAnalysisStarted(false);
    setAnalysisResults(createEmptyAnalysisRecord());
    setLatestAnalysisAt(null);
  };

  const handleCreateField = () => {
    setGeoJsonData(null);
    setGeoJsonMeta(null);
    setGeoJsonUploadResponse(null);
    setGeoJsonUploadError(null);
    setSelectedField(null);
    setPendingDrawnField(null);
    setFieldNameDraft('');
    setFieldCropTypeDraft('');
    setFieldPlantingDateDraft('');
    resetAnalysisState();
    handleNavigate(APP_PAGES.WORKSPACE);
  };

  const handleNavigate = (page) => {
    if (page === APP_PAGES.ADMIN_PANEL && !isAdminUser(sessionUser)) {
      return;
    }

    const nextPage = getAccessiblePage(page, sessionUser);

    if (nextPage !== APP_PAGES.WORKSPACE) {
      setIsGuidedTourOpen(false);
    }

    setActivePage(nextPage);
  };

  const handleOpenGuidedTour = () => {
    setActivePage(APP_PAGES.WORKSPACE);
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
      const queuedJob = await runAnalysis({
        fieldId,
        startDate: seasonSelection.startDate,
        endDate: seasonSelection.endDate,
        seasonYear: Number(seasonSelection.seasonYear),
        satelliteSource: currentSatelliteFetchResult?.satellite_source || null,
        satelliteAcquisitionDate: currentSatelliteFetchResult?.acquisition_date || null,
        cloudCoverage: currentSatelliteFetchResult?.cloud_coverage ?? null,
        qualityFlags: currentSatelliteFetchResult?.quality_flags ?? null
      });
      const analysisId = queuedJob.analysis_id;

      setAnalysisResults((current) => ({
        ...current,
        analysisId,
        status: 'PROCESSING',
        seasonYear: String(queuedJob.season_year || seasonSelection.seasonYear),
        startDate: queuedJob.start_date || seasonSelection.startDate,
        endDate: queuedJob.end_date || seasonSelection.endDate,
        satelliteSource: currentSatelliteFetchResult?.satellite_source || null,
        satelliteAcquisitionDate: currentSatelliteFetchResult?.acquisition_date || null,
        cloudCoverage: currentSatelliteFetchResult?.cloud_coverage ?? null,
        qualityFlags: currentSatelliteFetchResult?.quality_flags ?? null,
        message: 'Analysis has started. Satellite indicators and model-assisted land-cover classification are being processed.'
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
        throw new Error('Analysis is still processing. Please check the results history later.');
      }

      const historyResponse = await fetchAnalysisHistory();
      const completedAnalyses = (historyResponse.data || [])
        .filter((item) => item.status === 'DONE' && item.analysis_id === analysisId);

      const latestAnalysis = completedAnalyses[0];

      if (!latestAnalysis) {
        throw new Error('Analysis completed, but results were not found in history.');
      }

      const normalizedResult = normalizeAnalysisRecord(latestAnalysis);

      setAnalysisResults(normalizedResult);
      setLatestAnalysisAt(normalizedResult.analysisDate || latestAnalysis.analysis_date || new Date().toISOString());
      setSelectedSeason(normalizedResult.seasonYear || selectedSeason);
      setSeasonSelection(getSeasonSelectionFromRecord(normalizedResult));
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
      geoJsonUploadResponse,
      seasonSelection
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
        bbox,
        startDate: seasonSelection.startDate,
        endDate: seasonSelection.endDate,
        seasonYear: Number(seasonSelection.seasonYear)
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

  const saveFieldFeatureCollection = async (fieldDetails, featureCollection) => {
    const trimmedFieldName = fieldDetails.name.trim();
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
      const response = await saveField({
        name: trimmedFieldName,
        geometry: geometryToSave,
        cropType: fieldDetails.cropType || null,
        plantingDate: fieldDetails.plantingDate || null,
        seasonYear: fieldDetails.seasonYear ? Number(fieldDetails.seasonYear) : null
      });
      const field = response.data;

      const metadata = {
        id: field.id,
        field_id: field.id,
        name: field.name || trimmedFieldName,
        area: field.area_ha || 0,
        role: field.role,
        crop_type: field.crop_type || fieldDetails.cropType || null,
        planting_date: field.planting_date || fieldDetails.plantingDate || null,
        season_year: field.season_year || fieldDetails.seasonYear || null
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
      setFieldCropTypeDraft(field.crop_type || fieldDetails.cropType || '');
      setFieldPlantingDateDraft(field.planting_date || fieldDetails.plantingDate || '');
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
      fieldNameDraft,
      fieldCropTypeDraft,
      fieldPlantingDateDraft
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

  const handleSaveUploadedField = async (fieldDetails) => (
    saveFieldFeatureCollection(fieldDetails, geoJsonData)
  );

  const handleSaveDrawnField = async (fieldName) => {
    if (!pendingDrawnField?.featureCollection) {
      return false;
    }

    return saveFieldFeatureCollection({
      name: fieldName,
      cropType: fieldCropTypeDraft,
      plantingDate: fieldPlantingDateDraft,
      seasonYear: seasonSelection.seasonYear
    }, pendingDrawnField.featureCollection);
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
    setFieldCropTypeDraft(pendingDrawnField.previousState.fieldCropTypeDraft);
    setFieldPlantingDateDraft(pendingDrawnField.previousState.fieldPlantingDateDraft);
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
    setFieldCropTypeDraft(field.crop_type || '');
    setFieldPlantingDateDraft(field.planting_date || '');
    setGeoJsonUploadResponse({
      status: 'success',
      data: field
    });
    setGeoJsonUploadError(null);
    if (field?.season_year) {
      setSelectedSeason(String(field.season_year));
      setSeasonSelection(createSeasonSelection(String(field.season_year), {
        seasonYear: String(field.season_year)
      }));
    }

    if (latestAnalysis?.analysis_id || latestAnalysis?.analysisId) {
      const normalized = normalizeAnalysisRecord(latestAnalysis);
      setAnalysisStarted(true);
      setAnalysisResults(normalized);
      setLatestAnalysisAt(normalized.analysisDate || latestAnalysis.analysis_date || new Date().toISOString());
      setSelectedSeason(normalized.seasonYear || selectedSeason);
      setSeasonSelection(getSeasonSelectionFromRecord(normalized));
    } else {
      resetAnalysisState();
    }

    if (navigate) {
      handleNavigate(APP_PAGES.WORKSPACE);
    }
  };

  const handleOpenAnalysis = (analysisItem, field) => {
    const normalized = normalizeAnalysisRecord(analysisItem);

    setAnalysisStarted(true);
    setAnalysisResults(normalized);
    setLatestAnalysisAt(normalized.analysisDate || analysisItem.analysis_date || new Date().toISOString());
    setSelectedSeason(normalized.seasonYear || selectedSeason);
    setSeasonSelection(getSeasonSelectionFromRecord(normalized));
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
      setFieldCropTypeDraft(field.crop_type || '');
      setFieldPlantingDateDraft(field.planting_date || '');
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
      setFieldNameDraft(normalized.fieldName || '');
      setFieldCropTypeDraft(normalized.fieldMetadata?.cropType || '');
      setFieldPlantingDateDraft(normalized.fieldMetadata?.plantingDate || '');
    }

    handleNavigate(APP_PAGES.ANALYSIS_RESULTS);
  };

  const handleRunNewAnalysisFromResults = async () => {
    handleNavigate(APP_PAGES.WORKSPACE);
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

  const currentFieldId = getCurrentFieldId({ geoJsonUploadResponse });

  const currentWorkspaceFieldKey = buildWorkspaceFieldKey({
    geoJsonData,
    selectedField,
    geoJsonUploadResponse,
    seasonSelection
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
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  if (appView === 'auth') {
    return (
      <AuthPage
        onBack={() => setAppView('landing')}
        onLogin={handleLogin}
        onRegistered={handleRegisterSuccess}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  const renderFieldsPage = () => (
    <FieldsPage
      user={sessionUser}
      backendHealthy={backendHealthy}
      onNavigate={handleNavigate}
      refreshKey={dataRefreshKey}
      onOpenField={handleOpenField}
      onOpenAnalysis={handleOpenAnalysis}
      onCreateField={handleCreateField}
    />
  );

  const renderDashboardPage = () => (
    <DashboardPage
      user={sessionUser}
      backendHealthy={backendHealthy}
      onNavigate={handleNavigate}
      refreshKey={dataRefreshKey}
      latestAnalysisAt={latestAnalysisAt}
    />
  );

  const renderPrivatePage = () => {
    switch (effectiveActivePage) {
      case APP_PAGES.WORKSPACE:
        return (
          <WorkspacePage
            user={sessionUser}
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
            fieldCropType={fieldCropTypeDraft}
            setFieldCropType={setFieldCropTypeDraft}
            fieldPlantingDate={fieldPlantingDateDraft}
            setFieldPlantingDate={setFieldPlantingDateDraft}
            seasonSelection={seasonSelection}
            onSeasonSelectionChange={(nextSelection) => {
              setSeasonSelection(nextSelection);
              setSelectedSeason(String(nextSelection.seasonYear || getCurrentSeasonYear()));
            }}
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
            onOpenField={handleOpenField}
            onOpenAnalysis={handleOpenAnalysis}
            isGuidedTourOpen={isGuidedTourOpen}
            onCloseGuidedTour={handleCloseGuidedTour}
          />
        );
      case APP_PAGES.ANALYSIS_RESULTS:
        return (
          <AnalysisResultsPage
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
            onRunNewAnalysis={handleRunNewAnalysisFromResults}
            onOpenAnalysis={handleOpenAnalysis}
            refreshKey={dataRefreshKey}
          />
        );
      case APP_PAGES.FIELDS:
        return renderFieldsPage();
      case APP_PAGES.SETTINGS:
        return (
          <SettingsPage
            user={sessionUser}
            onUpdateUser={handleUpdateUser}
          />
        );
      case APP_PAGES.FIELD_SHARING:
        return (
          <FieldSharingPage
            user={sessionUser}
            onNavigate={handleNavigate}
          />
        );
      case APP_PAGES.ADMIN_PANEL:
        return (
          <AdminPanelPage
            refreshKey={dataRefreshKey}
          />
        );
      case APP_PAGES.DASHBOARD:
        return renderDashboardPage();
      default:
        return isAdminUser(sessionUser) ? renderDashboardPage() : renderFieldsPage();
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
        <AppHeader
          activePage={effectiveActivePage}
          onNavigate={handleNavigate}
          onOpenGuidedTour={handleOpenGuidedTour}
          user={sessionUser}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />
        {renderPrivatePage()}
      </div>
    </div>
  );
}

export default App;
