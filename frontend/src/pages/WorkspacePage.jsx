import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import GuidedTour from '../components/common/GuidedTour';
import MapView from '../components/workspace/MapView';
import WorkspaceSidebar from '../components/workspace/WorkspaceSidebar';

export default function WorkspacePage({
  user,
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
  analysisResults,
  analysisStarted
}) {
  return (
    <div className="dashboard-content workspace-shell" style={{ position: 'relative' }}>
      <WorkspaceSidebar
        user={user}
        selectedField={selectedField}
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
        fieldName={fieldName}
        setFieldName={setFieldName}
        fieldLayerVisible={fieldLayerVisible}
        setFieldLayerVisible={setFieldLayerVisible}
        setSelectedField={setSelectedField}
        onSaveField={onSaveField}
        isSavingField={isSavingField}
      />

      <main className="map-container" style={{ position: 'relative' }}>
        <MapView
          user={user}
          analysisStarted={analysisStarted}
          isAnalyzing={isAnalyzing}
          geoJsonData={geoJsonData}
          selectedField={selectedField}
          setSelectedField={setSelectedField}
          fieldLayerVisible={fieldLayerVisible}
          onPolygonDrawn={onPolygonDrawn}
          analysisResults={analysisResults}
        />

        {isAnalyzing && (
          <div
            style={{
              position: 'absolute',
              top: '24px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '16px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              boxShadow: '0 12px 24px rgba(0,0,0,0.3)',
              zIndex: 1000
            }}
          >
            <Loader2
              size={24}
              color="var(--accent-color)"
              style={{ animation: 'spin 1s linear infinite' }}
            />
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Analyzing Field Data</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Processing satellite imagery and running AI models...
              </p>
            </div>
            <style>
              {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
            </style>
          </div>
        )}
      </main>

      {isDrawFieldNamingOpen && (
        <DrawnFieldNameModal
          isSavingField={isSavingField}
          onSave={onSaveDrawnField}
          onCancel={onCancelDrawnField}
        />
      )}

      <GuidedTour activePage={activePage} analysisStarted={analysisStarted} />
    </div>
  );
}

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
