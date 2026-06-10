import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchAllFields, fetchAnalysisHistory } from '../api/client';
import { getFieldPermissions } from '../permissions/permissions';
import FieldMap from '../components/workspace/FieldMap';
import FieldControlPanel from '../components/workspace/FieldControlPanel';
import WorkspaceGuide from '../components/workspace/WorkspaceGuide';
import {
  buildFieldWorkspaceSummaries,
  createFieldFallbackRecord,
  getFieldSelectionName,
  sortAnalysesByNewest
} from '../utils/fieldAnalysisUtils';

const getRunAnalysisReason = ({
  hasGeometry,
  hasSavedField,
  hasSatelliteMetadata,
  canAnalyze,
  isFetchingSatelliteData,
  isAnalyzing
}) => {
  if (!hasGeometry) {
    return 'Select, upload, or draw a field boundary first.';
  }

  if (!hasSavedField) {
    return 'Save the field before running analysis.';
  }

  if (!hasSatelliteMetadata) {
    return 'Fetch satellite metadata for the selected season or date range first.';
  }

  if (!canAnalyze) {
    return 'Your current field role is view-only. OWNER or EDITOR access is required.';
  }

  if (isFetchingSatelliteData) {
    return 'Wait for the satellite metadata request to finish.';
  }

  if (isAnalyzing) {
    return 'Analysis is already in progress for this session.';
  }

  return '';
};

const hasUsableAnalysisResult = (analysis) => (
  analysis?.status === 'DONE' ||
  Boolean(analysis?.predictedClass || analysis?.riskLevel) ||
  analysis?.ndviValue !== null && analysis?.ndviValue !== undefined ||
  analysis?.eviValue !== null && analysis?.eviValue !== undefined
);

const doesAnalysisMatchField = (analysis, fieldRecord, selectedFieldName) => {
  if (!analysis) {
    return false;
  }

  const analysisFieldId = analysis?.fieldId || analysis?.field_id || null;
  const currentFieldId = fieldRecord?.id || null;

  if (analysisFieldId && currentFieldId) {
    return String(analysisFieldId) === String(currentFieldId);
  }

  const analysisFieldName = analysis?.fieldName || analysis?.field_name || null;
  const comparableFieldName = fieldRecord?.name || selectedFieldName || null;

  return Boolean(analysisFieldName && comparableFieldName && analysisFieldName === comparableFieldName);
};

export default function WorkspacePage({
  user,
  refreshKey,
  backendHealthy,
  isAnalyzing,
  onRunAnalysis,
  isFetchingSatelliteData,
  onFetchSatelliteData,
  satelliteFetchResult,
  satelliteFetchError,
  geoJsonData,
  setGeoJsonData,
  geoJsonMeta,
  setGeoJsonMeta,
  geoJsonUploadResponse,
  setGeoJsonUploadResponse,
  geoJsonUploadError,
  setGeoJsonUploadError,
  fieldName,
  setFieldName,
  seasonSelection,
  onSeasonSelectionChange,
  fieldLayerVisible,
  setFieldLayerVisible,
  selectedField,
  setSelectedField,
  onPolygonDrawn,
  onSaveField,
  isSavingField,
  isDrawFieldNamingOpen,
  onSaveDrawnField,
  onCancelDrawnField,
  currentFieldId,
  analysisResults,
  analysisStarted,
  latestAnalysisAt,
  onOpenAnalysis,
  isGuidedTourOpen,
  onCloseGuidedTour
}) {
  const [fields, setFields] = useState([]);
  const [history, setHistory] = useState([]);
  const [contextNotice, setContextNotice] = useState('');

  useEffect(() => {
    let isActive = true;

    const loadWorkspaceContext = async () => {
      const [fieldsResponse, historyResponse] = await Promise.allSettled([
        fetchAllFields(),
        fetchAnalysisHistory()
      ]);

      if (!isActive) {
        return;
      }

      if (fieldsResponse.status === 'fulfilled') {
        setFields(fieldsResponse.value.data || []);
      } else {
        setFields([]);
      }

      if (historyResponse.status === 'fulfilled') {
        setHistory(sortAnalysesByNewest(historyResponse.value.data || []));
      } else {
        setHistory([]);
      }

      const hasFailure =
        fieldsResponse.status === 'rejected' ||
        historyResponse.status === 'rejected';

      if (hasFailure) {
        setContextNotice(
          backendHealthy
            ? 'Some field history could not be refreshed. Showing the latest available context.'
            : 'Backend is not connected. Demo values and local field context are shown where possible.'
        );
      } else {
        setContextNotice('');
      }
    };

    void loadWorkspaceContext();

    return () => {
      isActive = false;
    };
  }, [backendHealthy, refreshKey]);

  const fallbackFieldRecord = useMemo(
    () => createFieldFallbackRecord(selectedField, currentFieldId),
    [currentFieldId, selectedField]
  );

  const effectiveFields = useMemo(() => {
    if (fields.length > 0) {
      return fields;
    }

    return fallbackFieldRecord ? [fallbackFieldRecord] : [];
  }, [fallbackFieldRecord, fields]);

  const fieldSummaries = useMemo(
    () => buildFieldWorkspaceSummaries(effectiveFields, history, seasonSelection?.seasonYear),
    [effectiveFields, history, seasonSelection]
  );

  const selectedFieldSummary = useMemo(() => {
    if (currentFieldId) {
      return fieldSummaries.find((item) => String(item.field.id) === String(currentFieldId)) || null;
    }

    const currentFieldName = getFieldSelectionName(selectedField);
    return fieldSummaries.find((item) => item.field.name === currentFieldName) || null;
  }, [currentFieldId, fieldSummaries, selectedField]);

  const currentFieldRecord = selectedFieldSummary?.field || fallbackFieldRecord || null;
  const selectedFieldName = currentFieldRecord?.name || getFieldSelectionName(selectedField);
  const currentFieldAnalyses = useMemo(
    () => selectedFieldSummary?.analyses || [],
    [selectedFieldSummary]
  );
  const currentSessionAnalysis = useMemo(() => {
    if (!analysisStarted || !hasUsableAnalysisResult(analysisResults)) {
      return null;
    }

    if (
      (currentFieldRecord || selectedFieldName) &&
      !doesAnalysisMatchField(analysisResults, currentFieldRecord, selectedFieldName)
    ) {
      return null;
    }

    return {
      ...analysisResults,
      analysisDate: latestAnalysisAt || analysisResults.analysisDate
    };
  }, [analysisResults, analysisStarted, currentFieldRecord, latestAnalysisAt, selectedFieldName]);
  const latestSeasonUsableAnalysis = useMemo(
    () => selectedFieldSummary?.seasonAnalyses?.find((item) => hasUsableAnalysisResult(item)) || null,
    [selectedFieldSummary]
  );
  const latestStoredUsableAnalysis = useMemo(
    () => currentFieldAnalyses.find((item) => hasUsableAnalysisResult(item)) || null,
    [currentFieldAnalyses]
  );
  const latestResultAnalysis = useMemo(() => (
    currentSessionAnalysis ||
    latestSeasonUsableAnalysis ||
    latestStoredUsableAnalysis ||
    selectedFieldSummary?.latestAnalysis ||
    null
  ), [
    currentSessionAnalysis,
    latestSeasonUsableAnalysis,
    latestStoredUsableAnalysis,
    selectedFieldSummary
  ]);
  const permissions = getFieldPermissions(selectedField?.properties || selectedField, user);
  const runAnalysisReason = getRunAnalysisReason({
    hasGeometry: Boolean(geoJsonData),
    hasSavedField: Boolean(currentFieldId),
    hasSatelliteMetadata: Boolean(satelliteFetchResult),
    canAnalyze: permissions.canAnalyze,
    isFetchingSatelliteData,
    isAnalyzing
  });
  const canViewResults = Boolean(latestResultAnalysis && hasUsableAnalysisResult(latestResultAnalysis));
  const workspaceMapTitle =
    selectedFieldName && selectedFieldName !== 'Unnamed Field'
      ? selectedFieldName
      : 'Field workspace';
  const viewResultsFieldRecord = useMemo(() => {
    if (currentFieldRecord?.geometry) {
      return currentFieldRecord;
    }

    if (!selectedField?.geometry) {
      return currentFieldRecord || null;
    }

    return {
      id: currentFieldRecord?.id || selectedField?.properties?.id || selectedField?.properties?.field_id || null,
      name: currentFieldRecord?.name || selectedFieldName || selectedField?.properties?.name || 'Selected field',
      area_ha: currentFieldRecord?.area_ha || selectedField?.properties?.area_ha || selectedField?.properties?.area || 0,
      role: currentFieldRecord?.role || selectedField?.properties?.role || null,
      crop_type: currentFieldRecord?.crop_type || selectedField?.properties?.crop_type || null,
      planting_date: currentFieldRecord?.planting_date || selectedField?.properties?.planting_date || null,
      season_year: currentFieldRecord?.season_year || selectedField?.properties?.season_year || null,
      geometry: selectedField.geometry
    };
  }, [currentFieldRecord, selectedField, selectedFieldName]);

  const handleViewResults = () => {
    if (!latestResultAnalysis) {
      return;
    }

    onOpenAnalysis?.(latestResultAnalysis, viewResultsFieldRecord);
  };

  return (
    <div className="content-page workspace-page">
      {contextNotice ? (
        <div className="workspace-notice-banner">{contextNotice}</div>
      ) : null}

      <div className="workspace-layout-grid">
        <div className="workspace-sidebar-column">
          <FieldControlPanel
            user={user}
            selectedField={selectedField}
            isFetchingSatelliteData={isFetchingSatelliteData}
            isAnalyzing={isAnalyzing}
            onFetchSatelliteData={onFetchSatelliteData}
            satelliteFetchResult={satelliteFetchResult}
            satelliteFetchError={satelliteFetchError}
            geoJsonData={geoJsonData}
            setGeoJsonData={setGeoJsonData}
            geoJsonMeta={geoJsonMeta}
            setGeoJsonMeta={setGeoJsonMeta}
            geoJsonUploadResponse={geoJsonUploadResponse}
            setGeoJsonUploadResponse={setGeoJsonUploadResponse}
            geoJsonUploadError={geoJsonUploadError}
            setGeoJsonUploadError={setGeoJsonUploadError}
            fieldName={fieldName}
            setFieldName={setFieldName}
            seasonSelection={seasonSelection}
            onSeasonSelectionChange={onSeasonSelectionChange}
            fieldLayerVisible={fieldLayerVisible}
            setFieldLayerVisible={setFieldLayerVisible}
            setSelectedField={setSelectedField}
            onSaveField={onSaveField}
            isSavingField={isSavingField}
            onRunAnalysis={onRunAnalysis}
            onViewResults={handleViewResults}
            canRunAnalysis={!runAnalysisReason}
            canViewResults={canViewResults}
            runAnalysisReason={runAnalysisReason}
          />
        </div>

        <main className="workspace-stage-column workspace-main-stage" tabIndex={-1}>
          <section className="workspace-stage-map-card workspace-stage-map-only glass-panel" data-guide="selected-field-section">
            <div className="workspace-map-stage workspace-stage-map-shell" style={mapPanelStyle}>
              <FieldMap
                user={user}
                backendHealthy={backendHealthy}
                analysisStarted={false}
                isAnalyzing={isAnalyzing}
                geoJsonData={geoJsonData}
                selectedField={selectedField}
                setSelectedField={setSelectedField}
                fieldLayerVisible={fieldLayerVisible}
                onPolygonDrawn={onPolygonDrawn}
                analysisResults={analysisResults}
                fieldName={workspaceMapTitle}
                hasStoredAnalysis={false}
                legendMode="priority"
                showInfoCard={false}
              />
            </div>
          </section>
        </main>
      </div>

      <WorkspaceGuide
        activePage="Workspace"
        isOpen={Boolean(isGuidedTourOpen)}
        onClose={onCloseGuidedTour}
      />

      {isDrawFieldNamingOpen && (
        <DrawnFieldNameModal
          isSavingField={isSavingField}
          onSave={onSaveDrawnField}
          onCancel={onCancelDrawnField}
        />
      )}
    </div>
  );
}

const mapPanelStyle = {
  position: 'relative',
  overflow: 'hidden'
};

function DrawnFieldNameModal({ isSavingField, onSave, onCancel }) {
  const [fieldName, setFieldName] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const wasSaved = await onSave(fieldName);
    if (!wasSaved) {
      inputRef.current?.focus();
    }
  };

  return (
    <div style={modalOverlayStyle}>
      <form className="glass-panel" style={modalStyle} onSubmit={handleSubmit}>
        <h2 style={{ marginBottom: '8px' }}>Name this field</h2>
        <p style={modalCopyStyle}>Save the drawn boundary with a field name before analysis.</p>

        <label style={labelStyle} htmlFor="drawn-field-name">
          Field name
        </label>
        <input
          id="drawn-field-name"
          ref={inputRef}
          style={inputStyle}
          value={fieldName}
          onChange={(event) => setFieldName(event.target.value)}
          placeholder="North Wheat Field"
          required
        />

        <div style={modalActionsStyle}>
          <button type="button" className="secondary-btn" onClick={onCancel} disabled={isSavingField}>
            Cancel
          </button>

          <button
            type="submit"
            className="primary-btn"
            disabled={isSavingField || !fieldName.trim()}
          >
            {isSavingField ? 'Saving...' : 'Save Field'}
          </button>
        </div>
      </form>
    </div>
  );
}

const modalOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'var(--surface-contrast)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: '24px'
};

const modalStyle = {
  width: '100%',
  maxWidth: '420px',
  padding: '24px',
  borderRadius: '20px'
};

const modalCopyStyle = {
  color: 'var(--text-secondary)',
  lineHeight: 1.6
};

const labelStyle = {
  display: 'block',
  marginTop: '16px',
  marginBottom: '8px',
  color: 'var(--text-secondary)',
  fontWeight: 700,
  fontSize: '0.78rem'
};

const inputStyle = {
  width: '100%',
  padding: '11px 12px',
  borderRadius: '12px',
  background: 'var(--surface-4)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  outline: 'none'
};

const modalActionsStyle = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: '10px',
  marginTop: '20px'
};
