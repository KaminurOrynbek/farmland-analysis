import React, { useRef, useState } from 'react';
import {
  Image as ImageIcon,
  Upload,
  X
} from 'lucide-react';
import { getFieldPermissions } from '../../permissions/permissions';
import { getFieldSelectionId } from '../../utils/fieldAnalysisUtils';

const normalizeGeoJson = (geoJson, metadata = {}) => {
  if (geoJson.type === 'FeatureCollection') {
    return {
      ...geoJson,
      features: geoJson.features.map((feature, index) => (
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
  }

  if (geoJson.type === 'Feature') {
    return {
      type: 'FeatureCollection',
      features: [
        {
          ...geoJson,
          properties: {
            ...geoJson.properties,
            ...metadata
          }
        }
      ]
    };
  }

  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {
          ...metadata
        },
        geometry: geoJson
      }
    ]
  };
};

function SidebarSection({ title, children, guideId = null }) {
  return (
    <section className="workspace-panel-section" data-guide={guideId || undefined}>
      <strong style={{ fontSize: '0.96rem' }}>{title}</strong>
      {children}
    </section>
  );
}

export default function WorkspaceSidebar({
  user,
  workspaceNotice,
  selectedField,
  isFetchingSatelliteData,
  isAnalyzing,
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
  setSelectedField,
  onSaveField,
  isSavingField
}) {
  const geoJsonInputRef = useRef(null);
  const permissions = getFieldPermissions(selectedField?.properties || selectedField, user);
  const canCreateField = permissions.canCreateField;
  const currentFieldId = getFieldSelectionId(selectedField) || getFieldSelectionId(geoJsonUploadResponse?.data);
  const [satelliteDataset, setSatelliteDataset] = useState('sentinel2');

  const hasGeometry = Boolean(geoJsonData);
  const hasUnsavedGeometry = Boolean(geoJsonData && !geoJsonUploadResponse);
  const hasSavedField = Boolean(currentFieldId);

  const handleGeoJsonUpload = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.name.endsWith('.geojson') && !file.name.endsWith('.json')) {
      setGeoJsonUploadError('Please select a valid GeoJSON file.');
      return;
    }

    const reader = new FileReader();

    reader.onload = (loadEvent) => {
      try {
        const parsedJson = JSON.parse(loadEvent.target.result);
        const normalizedData = normalizeGeoJson(parsedJson);
        const nextSelectedField = normalizedData.features[0] || null;

        setGeoJsonData(normalizedData);
        setGeoJsonMeta({
          name: file.name,
          size: (file.size / 1024).toFixed(1)
        });
        setGeoJsonUploadResponse(null);
        setGeoJsonUploadError(null);
        setSelectedField(nextSelectedField);
        setFieldName(file.name.replace(/\.(geojson|json)$/i, '').trim());
      } catch (error) {
        console.error('Error parsing GeoJSON', error);
        setGeoJsonUploadError(
          'The selected file could not be parsed. Please upload a standard GeoJSON boundary.'
        );
      }
    };

    reader.readAsText(file);
  };

  const handleRemoveGeoJson = () => {
    setGeoJsonData(null);
    setGeoJsonMeta(null);
    setGeoJsonUploadResponse(null);
    setGeoJsonUploadError(null);
    setSelectedField(null);
    setFieldName('');

    if (geoJsonInputRef.current) {
      geoJsonInputRef.current.value = '';
    }
  };

  const handleSaveField = async () => {
    await onSaveField?.(fieldName);
  };

  return (
    <aside className="workspace-sidebar-panel glass-panel" data-guide="workspace-sidebar">
      {workspaceNotice ? (
        <div className="workspace-notice-banner">
          {workspaceNotice}
        </div>
      ) : null}

      <input
        type="file"
        accept=".geojson,.json"
        ref={geoJsonInputRef}
        onChange={handleGeoJsonUpload}
        style={{ display: 'none' }}
      />

      <SidebarSection title="GeoJSON" guideId="field-upload-section">
        <button
          type="button"
          className="secondary-btn"
          onClick={() => geoJsonInputRef.current?.click()}
          data-guide="upload-geojson"
          disabled={!canCreateField}
        >
          <Upload size={16} />
          Upload GeoJSON
        </button>

        {geoJsonData ? (
          <div className="workspace-note-card">
            <div className="workspace-inline-title">
              <strong>{geoJsonMeta?.name || 'Current boundary'}</strong>
              <button type="button" onClick={handleRemoveGeoJson} className="workspace-icon-btn">
                <X size={14} />
              </button>
            </div>
            <p className="workspace-helper-text">{hasSavedField ? 'Saved field' : 'Ready to save'}</p>
          </div>
        ) : null}

        {geoJsonUploadError ? (
          <div className="workspace-note-card">
            <strong>GeoJSON upload issue</strong>
            <p className="workspace-helper-text">{geoJsonUploadError}</p>
          </div>
        ) : null}
      </SidebarSection>

      <SidebarSection title="Field" guideId="field-save-section">
        <label className="workspace-label" htmlFor="field-name-input">
          Field name
        </label>
        <input
          id="field-name-input"
          type="text"
          value={fieldName}
          onChange={(event) => setFieldName(event.target.value)}
          placeholder="North Wheat Field"
          className="workspace-input"
          data-guide="field-name"
          disabled={!canCreateField}
        />

        <button
          type="button"
          className="primary-btn"
          onClick={handleSaveField}
          disabled={!canCreateField || !hasUnsavedGeometry || !fieldName.trim() || isSavingField}
          data-guide="save-field"
        >
          {isSavingField ? 'Saving...' : 'Save field'}
        </button>
      </SidebarSection>

      <SidebarSection title="Satellite source" guideId="satellite-source-section">
        <select
          className="workspace-input"
          value={satelliteDataset}
          onChange={(event) => setSatelliteDataset(event.target.value)}
          data-guide="satellite-source"
        >
          <option value="sentinel2">Sentinel-2 (Optical)</option>
          <option value="landsat">Landsat 8-9</option>
        </select>
      </SidebarSection>

      <SidebarSection title="Fetch data" guideId="fetch-data-section">
        <button
          type="button"
          className="secondary-btn"
          onClick={() => onFetchSatelliteData?.(satelliteDataset)}
          disabled={!hasGeometry || isFetchingSatelliteData || isAnalyzing}
          data-guide="fetch-satellite"
        >
          <ImageIcon size={16} />
          {isFetchingSatelliteData ? 'Fetching...' : 'Fetch satellite data'}
        </button>

        {satelliteFetchResult ? (
          <p className="workspace-helper-text" style={{ margin: 0 }}>
            {satelliteFetchResult.dataset || 'Satellite metadata ready'} · {satelliteFetchResult.acquisition_date || 'Date pending'}
          </p>
        ) : null}

        {satelliteFetchError ? (
          <p className="workspace-helper-text" style={{ margin: 0 }}>
            Satellite metadata is unavailable right now.
          </p>
        ) : null}
      </SidebarSection>

      <SidebarSection title="Map layers" guideId="map-layers-section">
        <label className="workspace-checkbox-row">
          <input
            type="checkbox"
            checked
            readOnly
          />
          <span>Satellite basemap</span>
        </label>

        <label className="workspace-checkbox-row">
          <input
            type="checkbox"
            checked={fieldLayerVisible}
            onChange={(event) => setFieldLayerVisible(event.target.checked)}
          />
          <span>Field boundaries</span>
        </label>
      </SidebarSection>
    </aside>
  );
}
