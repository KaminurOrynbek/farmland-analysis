import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { fetchAllFields, fetchAnalysisHistory } from '../api/client';
import { getFieldPermissions } from '../permissions/permissions';
import MapView from '../components/workspace/FieldMap';
import WorkspaceSidebar from '../components/workspace/FieldControlPanel';
import WorkspaceGuide from '../components/workspace/WorkspaceGuide';
import WorkspaceSelectionCard from '../components/workspace/WorkspaceSelectionCard';
import {
  buildFieldWorkspaceSummaries,
  createFieldFallbackRecord,
  getFieldSelectionName,
  sortAnalysesByNewest
} from '../utils/fieldAnalysisUtils';

const getRunAnalysisReason = ({
  hasGeometry,
  hasSavedField,
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
  onOpenReport,
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
    () => buildFieldWorkspaceSummaries(effectiveFields, history),
    [effectiveFields, history]
  );

  const selectedFieldSummary = useMemo(() => {
    if (currentFieldId) {
      return fieldSummaries.find((item) => String(item.field.id) === String(currentFieldId)) || null;
    }

    const currentFieldName = getFieldSelectionName(selectedField);
    return fieldSummaries.find((item) => item.field.name === currentFieldName) || null;
  }, [currentFieldId, fieldSummaries, selectedField]);

  const currentFieldRecord = selectedFieldSummary?.field || fallbackFieldRecord || null;
  const currentFieldAnalyses = selectedFieldSummary?.analyses || [];
  const fieldRiskLevel =
    analysisStarted && analysisResults?.riskLevel && analysisResults.riskLevel !== '—'
      ? analysisResults.riskLevel
      : selectedFieldSummary?.latestOverallAnalysis?.risk_level || null;
  const permissions = getFieldPermissions(selectedField?.properties || selectedField, user);
  const runAnalysisReason = getRunAnalysisReason({
    hasGeometry: Boolean(geoJsonData),
    hasSavedField: Boolean(currentFieldId),
    canAnalyze: permissions.canAnalyze,
    isFetchingSatelliteData,
    isAnalyzing
  });
  const canViewReport = Boolean(
    (analysisStarted && analysisResults?.analysisId) ||
    currentFieldAnalyses.length
  );

  return (
    <div className="content-page workspace-page">
      {contextNotice ? (
        <div className="workspace-notice-banner">{contextNotice}</div>
      ) : null}

      <div className="workspace-layout-grid">
        <div className="workspace-sidebar-column">
          <WorkspaceSidebar
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
            fieldLayerVisible={fieldLayerVisible}
            setFieldLayerVisible={setFieldLayerVisible}
            setSelectedField={setSelectedField}
            onSaveField={onSaveField}
            isSavingField={isSavingField}
            onRunAnalysis={onRunAnalysis}
            canRunAnalysis={!runAnalysisReason}
            runAnalysisReason={runAnalysisReason}
          />
        </div>

        <div className="workspace-stage-column">
          {isAnalyzing ? (
            <div className="glass-panel" style={analysisNoticeStyle}>
              <Loader2
                size={18}
                color="var(--accent-color)"
                style={{ animation: 'spin 1s linear infinite' }}
              />
              <div>
                <strong style={{ display: 'block', marginBottom: '4px' }}>Analyzing field data</strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.84rem' }}>
                  Processing satellite imagery, vegetation indices, and the transfer learning model.
                </span>
              </div>
              <style>
                {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
              </style>
            </div>
          ) : null}

          <main className="map-container workspace-map-stage" style={mapPanelStyle} tabIndex={-1}>
            <MapView
              user={user}
              backendHealthy={backendHealthy}
              analysisStarted={analysisStarted}
              isAnalyzing={isAnalyzing}
              geoJsonData={geoJsonData}
              selectedField={selectedField}
              setSelectedField={setSelectedField}
              fieldLayerVisible={fieldLayerVisible}
              onPolygonDrawn={onPolygonDrawn}
              analysisResults={analysisResults}
              fieldRiskLevel={fieldRiskLevel}
              fieldName={currentFieldRecord?.name || getFieldSelectionName(selectedField)}
              hasStoredAnalysis={Boolean(currentFieldAnalyses.length || analysisStarted)}
              showInfoCard={false}
            />

            <WorkspaceSelectionCard
              user={user}
              fieldId={currentFieldId}
              selectedField={selectedField}
              hasGeometry={Boolean(geoJsonData)}
              fieldRecord={currentFieldRecord}
              riskLevel={fieldRiskLevel}
              latestAnalysisAt={latestAnalysisAt || selectedFieldSummary?.latestAnalysisAt || null}
              analysisHistory={currentFieldAnalyses}
              canViewReport={canViewReport}
              onOpenReport={onOpenReport}
            />
          </main>
        </div>
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

const analysisNoticeStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '14px 16px'
};

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
  background: 'rgba(2, 6, 23, 0.72)',
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
  background: 'rgba(15, 23, 42, 0.45)',
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
