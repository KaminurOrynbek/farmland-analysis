import React, { useEffect, useRef, useState } from 'react';
import {
  Image as ImageIcon,
  Pencil,
  Upload,
  X
} from 'lucide-react';
import { getFieldPermissions } from '../../permissions/permissions';
import {
  formatWorkspaceDate,
  getFieldSelectionId
} from '../../utils/fieldAnalysisUtils';
import MonitoringSeasonSelector from './MonitoringSeasonSelector';

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

export default function FieldControlPanel({
  user,
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
  seasonSelection,
  onSeasonSelectionChange,
  fieldLayerVisible,
  setFieldLayerVisible,
  setSelectedField,
  onSaveField,
  isSavingField,
  onRunAnalysis,
  onViewResults,
  canRunAnalysis,
  canViewResults,
  runAnalysisReason
}) {
  const geoJsonInputRef = useRef(null);
  const drawGuideTimeoutRef = useRef(null);
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
    await onSaveField?.({
      name: fieldName,
      cropType: null,
      plantingDate: null,
      seasonYear: null
    });
  };

  useEffect(() => (
    () => {
      if (drawGuideTimeoutRef.current) {
        window.clearTimeout(drawGuideTimeoutRef.current);
      }
    }
  ), []);

  const handleFocusMapDrawing = () => {
    const mapStage = document.querySelector('.workspace-map-stage');
    const toolbar = document.querySelector('[data-guide="draw-toolbar"]');
    const drawControls = [
      document.querySelector('[data-guide="draw-polygon-control"]'),
      document.querySelector('[data-guide="draw-rectangle-control"]')
    ].filter(Boolean);

    if (drawGuideTimeoutRef.current) {
      window.clearTimeout(drawGuideTimeoutRef.current);
    }

    mapStage?.scrollIntoView({ behavior: 'smooth', block: 'center' });

    window.setTimeout(() => {
      toolbar?.classList.add('workspace-draw-toolbar-highlight');
      drawControls.forEach((control) => control.classList.add('workspace-draw-tool-highlight'));

      if (drawControls[0] instanceof HTMLElement) {
        drawControls[0].focus({ preventScroll: true });
      }
    }, 220);

    drawGuideTimeoutRef.current = window.setTimeout(() => {
      toolbar?.classList.remove('workspace-draw-toolbar-highlight');
      drawControls.forEach((control) => control.classList.remove('workspace-draw-tool-highlight'));
    }, 3200);
  };

  return (
    <aside className="workspace-sidebar-panel workspace-control-panel glass-panel" data-guide="workspace-sidebar">
      <input
        type="file"
        accept=".geojson,.json"
        ref={geoJsonInputRef}
        onChange={handleGeoJsonUpload}
        style={{ display: 'none' }}
      />

      <SidebarSection title="Season" guideId="season-date-selection">
        <MonitoringSeasonSelector
          value={seasonSelection}
          onChange={onSeasonSelectionChange}
          allowCustom
          label=""
        />
      </SidebarSection>

      <SidebarSection title="Field boundary" guideId="field-upload-section">
        <p className="workspace-helper-text" style={{ margin: 0 }}>
          Upload a field boundary or draw one directly on the map.
        </p>

        <div className="workspace-boundary-methods">
          <button
            type="button"
            className="workspace-boundary-method"
            onClick={() => geoJsonInputRef.current?.click()}
            data-guide="upload-geojson"
            disabled={!canCreateField}
          >
            <span className="workspace-boundary-method-icon">
              <Upload size={16} />
            </span>
            <span>
              <strong>Upload GeoJSON</strong>
              <small>Choose an existing .geojson or .json field boundary file.</small>
            </span>
          </button>

          <button
            type="button"
            className="workspace-boundary-method"
            onClick={handleFocusMapDrawing}
            disabled={!canCreateField || isAnalyzing}
            data-guide="draw-on-map-button"
          >
            <span className="workspace-boundary-method-icon">
              <Pencil size={16} />
            </span>
            <span>
              <strong>Draw on map</strong>
              <small>Click to jump to the map tools, then choose polygon or rectangle.</small>
            </span>
          </button>
        </div>

        {geoJsonData ? (
          <div className="workspace-boundary-current">
            <div>
              <strong>{geoJsonMeta?.name || 'Current boundary'}</strong>
              <p className="workspace-helper-text">
                {hasSavedField ? 'Saved field boundary' : 'Boundary ready to save'}
              </p>
            </div>

            <button type="button" onClick={handleRemoveGeoJson} className="workspace-icon-btn">
              <X size={14} />
            </button>
          </div>
        ) : null}

        {geoJsonUploadError ? (
          <div className="workspace-note-card">
            <strong>GeoJSON upload issue</strong>
            <p className="workspace-helper-text">{geoJsonUploadError}</p>
          </div>
        ) : null}

        <label className="workspace-checkbox-row">
          <input
            type="checkbox"
            checked={fieldLayerVisible}
            onChange={(event) => setFieldLayerVisible(event.target.checked)}
          />
          <span>Show field boundary on map</span>
        </label>
      </SidebarSection>

      <SidebarSection title="Field details" guideId="field-details-section">
        <label className="workspace-field-stack">
          <span className="workspace-label">Field name</span>
          <input
            type="text"
            value={fieldName}
            onChange={(event) => setFieldName(event.target.value)}
            placeholder="North Wheat Field"
            className="workspace-input"
            data-guide="field-name"
            disabled={!canCreateField}
          />
        </label>

        <button
          type="button"
          className="primary-btn"
          onClick={handleSaveField}
          disabled={!canCreateField || !hasUnsavedGeometry || !fieldName.trim() || isSavingField}
          data-guide="save-field"
        >
          {isSavingField ? 'Saving...' : 'Save field'}
        </button>

        <p className="workspace-helper-text" style={{ margin: 0 }}>
          Field name is required before saving.
        </p>
      </SidebarSection>

      <SidebarSection title="Satellite data" guideId="satellite-data-section">
        <label className="workspace-field-stack">
          <span className="workspace-label">Satellite source</span>
          <select
            className="workspace-input"
            value={satelliteDataset}
            onChange={(event) => setSatelliteDataset(event.target.value)}
            data-guide="satellite-source"
          >
            <option value="sentinel2">Sentinel-2</option>
            <option value="landsat">Landsat 8-9</option>
          </select>
        </label>

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

        <p className="workspace-helper-text" style={{ margin: 0 }}>
          Fetch satellite metadata for the selected analysis period before running analysis.
        </p>

        {satelliteFetchResult ? (
          <div className="workspace-loaded-card">
            <strong>{satelliteFetchResult.satellite_source || 'Satellite metadata ready'}</strong>
            <p className="workspace-helper-text">
              Image date: {formatWorkspaceDate(satelliteFetchResult.acquisition_date, 'Not available')}
            </p>
            <p className="workspace-helper-text">
              Requested period: {formatWorkspaceDate(satelliteFetchResult.start_date)} to {formatWorkspaceDate(satelliteFetchResult.end_date)}
            </p>
          </div>
        ) : null}

        {satelliteFetchError ? (
          <div className="workspace-note-card">
            <strong>Satellite metadata unavailable</strong>
            <p className="workspace-helper-text">{satelliteFetchError}</p>
          </div>
        ) : null}
      </SidebarSection>

      <SidebarSection title="Run analysis" guideId="run-analysis-section">
        <div className="workspace-inline-actions">
          {canViewResults ? (
            <button
              type="button"
              className="secondary-btn"
              onClick={() => onViewResults?.()}
              data-guide="open-report"
            >
              View results
            </button>
          ) : null}

          <button
            type="button"
            className="primary-btn"
            onClick={() => onRunAnalysis?.()}
            disabled={!canRunAnalysis}
            title={runAnalysisReason || undefined}
            data-guide="run-analysis"
          >
            {isAnalyzing ? 'Analyzing...' : 'Run analysis'}
          </button>
        </div>

        {runAnalysisReason ? (
          <p className="workspace-helper-text" style={{ margin: 0 }}>
            {runAnalysisReason}
          </p>
        ) : (
          <p className="workspace-helper-text" style={{ margin: 0 }}>
            Run NDVI, EVI, and model-assisted land-cover classification.
          </p>
        )}
      </SidebarSection>
    </aside>
  );
}
