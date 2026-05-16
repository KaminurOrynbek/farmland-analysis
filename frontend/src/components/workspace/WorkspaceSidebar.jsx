import React, { useEffect, useRef, useState } from 'react';
import {
  Upload,
  Play,
  Layers,
  Map as MapIcon,
  Settings,
  X,
  Image as ImageIcon
} from 'lucide-react';
import {
  shareField,
  fetchFieldTeam,
  revokeFieldAccess
} from '../../api/client';
import { getFieldPermissions } from '../../permissions/permissions';

const normalizeGeoJson = (geoJson, metadata = {}) => {
  if (geoJson.type === 'FeatureCollection') {
    return {
      ...geoJson,
      features: geoJson.features.map((feature, index) =>
        index === 0
          ? {
              ...feature,
              properties: {
                ...feature.properties,
                ...metadata
              }
            }
          : feature
      )
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

export default function WorkspaceSidebar({
  user,
  selectedField,
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
  setSelectedField,
  onSaveField,
  isSavingField
}) {
  const geoJsonInputRef = useRef(null);

  const permissions = getFieldPermissions(selectedField?.properties || selectedField, user);
  const canCreateField = permissions.canCreateField;
  const canAnalyze = permissions.canAnalyze;
  const canShare = permissions.canShare;
  const canManageTeam = permissions.canManageTeam;

  const currentFieldId =
    selectedField?.properties?.id ||
    selectedField?.properties?.field_id ||
    geoJsonUploadResponse?.data?.id;

  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState('VIEWER');
  const [team, setTeam] = useState([]);
  const [sharingMessage, setSharingMessage] = useState('');
  const [isSharing, setIsSharing] = useState(false);

  const hasUnsavedGeometry = Boolean(geoJsonData && !geoJsonUploadResponse);

  const loadTeam = async () => {
    if (!currentFieldId || !canManageTeam) return;

    try {
      const data = await fetchFieldTeam(currentFieldId);
      setTeam(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load field team', error);
    }
  };

  useEffect(() => {
    const timeoutId = window.setTimeout(async () => {
      if (!currentFieldId || !canManageTeam) {
        setTeam([]);
        return;
      }

      try {
        const data = await fetchFieldTeam(currentFieldId);
        setTeam(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load field team', error);
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [currentFieldId, canManageTeam]);

  const handleShareField = async () => {
    if (!currentFieldId || !shareEmail.trim()) return;

    setIsSharing(true);
    setSharingMessage('');

    try {
      const result = await shareField({
        fieldId: currentFieldId,
        email: shareEmail.trim(),
        role: shareRole
      });

      setSharingMessage(result.message || 'Field shared successfully.');
      setShareEmail('');
      setShareRole('VIEWER');
      await loadTeam();
    } catch (error) {
      setSharingMessage(error.response?.data?.detail || 'Failed to share field.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleRevokeAccess = async (userId) => {
    if (!currentFieldId) return;

    try {
      await revokeFieldAccess({ fieldId: currentFieldId, userId });
      await loadTeam();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to revoke access.');
    }
  };

  const handleGeoJsonUpload = (e) => {
    const file = e.target.files[0];

    if (!file || (!file.name.endsWith('.geojson') && !file.name.endsWith('.json'))) {
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const parsedJson = JSON.parse(event.target.result);
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
        setTeam([]);
        setSharingMessage('');
      } catch (error) {
        console.error('Error parsing GeoJSON', error);
        alert('Invalid GeoJSON file. Must be standard GeoJSON format.');
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
    setTeam([]);
    setSharingMessage('');
    setFieldName('');

    if (geoJsonInputRef.current) {
      geoJsonInputRef.current.value = '';
    }
  };

  const handleSaveField = async () => {
    await onSaveField?.(fieldName);
  };

  return (
    <aside className="glass-panel" style={sidebarStyle}>
      <div>
        <h2 style={sectionTitleStyle}>Data Input</h2>

        <input
          type="file"
          accept=".geojson,.json"
          ref={geoJsonInputRef}
          onChange={handleGeoJsonUpload}
          style={{ display: 'none' }}
        />

        {canCreateField ? (
          <div style={fieldInputSectionStyle}>
            <label style={smallLabelStyle} htmlFor="field-name-input">
              Field name
            </label>

            <input
              id="field-name-input"
              type="text"
              value={fieldName}
              onChange={(event) => setFieldName(event.target.value)}
              placeholder="North Wheat Field"
              style={inputStyle}
            />

            <button
              type="button"
              onClick={() => geoJsonInputRef.current?.click()}
              style={uploadButtonStyle}
            >
              <Upload size={18} />
              Upload/Draw Field
            </button>

            <button
              type="button"
              onClick={handleSaveField}
              disabled={!hasUnsavedGeometry || !fieldName.trim() || isSavingField}
              style={{
                ...primaryActionButtonStyle,
                opacity: !hasUnsavedGeometry || !fieldName.trim() || isSavingField ? 0.65 : 1,
                cursor:
                  !hasUnsavedGeometry || !fieldName.trim() || isSavingField
                    ? 'not-allowed'
                    : 'pointer'
              }}
            >
              {isSavingField ? 'Saving...' : 'Save Field'}
            </button>

            <div style={helperTextStyle}>
              Upload a GeoJSON file or draw directly on the map, then save the field name.
            </div>
          </div>
        ) : !geoJsonData ? (
          <div style={lockedNoticeStyle}>
            You do not have permission to create or upload field boundaries.
          </div>
        ) : null}

        {geoJsonData && (
          <div style={loadedFieldStyle}>
            <div style={rowBetweenStyle}>
              <div style={loadedTitleStyle}>
                <MapIcon size={16} />
                Field bounds loaded
              </div>

              <button onClick={handleRemoveGeoJson} style={iconButtonStyle}>
                <X size={14} />
              </button>
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              <div style={ellipsisStyle}>{geoJsonMeta?.name}</div>

              <div style={rowBetweenStyle}>
                <span>{geoJsonMeta?.size ? `${geoJsonMeta.size} KB` : 'Manual drawing'}</span>

                {geoJsonUploadResponse ? (
                  <span style={successTextStyle}>● Validated</span>
                ) : geoJsonUploadError ? (
                  <span style={errorTextStyle}>⚠ Error</span>
                ) : (
                  <span style={mutedSmallTextStyle}>Ready to save</span>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Divider />

      <div>
        <h2 style={sectionTitleStyle}>Data Source</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={smallLabelStyle}>Dataset Selector</label>

          <select style={inputStyle}>
            <option>Sentinel-2 (Optical)</option>
            <option>Landsat 8-9</option>
            <option>PlanetScope (High-Res)</option>
          </select>
        </div>
      </div>

      <Divider />

      <div>
        <h2 style={sectionTitleStyle}>Data Actions</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={onFetchSatelliteData}
            disabled={isFetchingSatelliteData || isAnalyzing}
            style={{
              ...secondaryActionButtonStyle,
              cursor: isFetchingSatelliteData || isAnalyzing ? 'not-allowed' : 'pointer',
              opacity: isFetchingSatelliteData || isAnalyzing ? 0.6 : 1
            }}
          >
            {isFetchingSatelliteData ? (
              <>
                <SpinnerMini />
                Fetching...
              </>
            ) : (
              <>
                <ImageIcon size={18} />
                Fetch Satellite Data
              </>
            )}
          </button>

          <button
            onClick={onRunAnalysis}
            disabled={isAnalyzing || isFetchingSatelliteData || !geoJsonData || !canAnalyze}
            style={{
              ...runButtonStyle,
              backgroundColor: isAnalyzing ? 'rgba(59, 130, 246, 0.5)' : 'var(--accent-color)',
              boxShadow: isAnalyzing ? 'none' : '0 4px 14px 0 rgba(59, 130, 246, 0.39)',
              cursor:
                isAnalyzing || isFetchingSatelliteData || !geoJsonData || !canAnalyze
                  ? 'not-allowed'
                  : 'pointer',
              opacity: isAnalyzing || !geoJsonData || !canAnalyze ? 0.7 : 1
            }}
          >
            {isAnalyzing ? (
              <>
                <SpinnerWhite />
                Analyzing...
              </>
            ) : (
              <>
                <Play fill="white" size={16} />
                Run Analysis
              </>
            )}
          </button>

          {!canAnalyze && geoJsonData && (
            <div style={lockedNoticeStyle}>
              Your current field role allows viewing only. Analysis is available for OWNER and EDITOR.
            </div>
          )}
        </div>
      </div>

      {currentFieldId && canShare && (
        <>
          <Divider />

          <div>
            <h2 style={sectionTitleStyle}>Team Access</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <input
                type="email"
                value={shareEmail}
                onChange={(e) => setShareEmail(e.target.value)}
                placeholder="User email"
                style={inputStyle}
              />

              <select
                value={shareRole}
                onChange={(e) => setShareRole(e.target.value)}
                style={inputStyle}
              >
                <option value="VIEWER">VIEWER — view only</option>
                <option value="EDITOR">EDITOR — analyze and edit</option>
                <option value="OWNER">OWNER — full access</option>
              </select>

              <button
                type="button"
                onClick={handleShareField}
                disabled={isSharing || !shareEmail.trim()}
                style={{
                  ...primaryActionButtonStyle,
                  opacity: isSharing || !shareEmail.trim() ? 0.65 : 1,
                  cursor: isSharing || !shareEmail.trim() ? 'not-allowed' : 'pointer'
                }}
              >
                {isSharing ? 'Sharing...' : 'Grant Access'}
              </button>

              {sharingMessage && <div style={lockedNoticeStyle}>{sharingMessage}</div>}
            </div>

            {team.length > 0 && (
              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {team.map((member) => (
                  <div key={member.user_id} style={teamRowStyle}>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                        {member.full_name || member.email}
                      </div>

                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        {member.email} · {member.role}
                      </div>
                    </div>

                    {member.role !== 'OWNER' && (
                      <button
                        type="button"
                        onClick={() => handleRevokeAccess(member.user_id)}
                        style={smallDangerButtonStyle}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <Divider />

      <div>
        <h2 style={sectionTitleStyle}>Layer Controls</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { id: 'base', name: 'Satellite Basemap', icon: <MapIcon size={16} />, active: true },
            { id: 'ndvi', name: 'NDVI Heatmap', icon: <Layers size={16} />, active: true }
          ].map((layer) => (
            <label key={layer.id} style={checkboxLabelStyle}>
              <input
                type="checkbox"
                defaultChecked={layer.active}
                style={checkboxStyle}
              />
              <span style={layerTextStyle}>
                {layer.icon}
                {layer.name}
              </span>
            </label>
          ))}

          <label style={checkboxLabelStyle}>
            <input
              type="checkbox"
              checked={fieldLayerVisible}
              onChange={(e) => setFieldLayerVisible(e.target.checked)}
              style={checkboxStyle}
            />
            <span style={layerTextStyle}>
              <Settings size={16} />
              Field Boundaries
            </span>
          </label>
        </div>
      </div>

      <style>
        {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
      </style>
    </aside>
  );
}

function Divider() {
  return <div style={{ height: '1px', background: 'var(--border-color)' }} />;
}

function SpinnerMini() {
  return <div style={spinnerMiniStyle} />;
}

function SpinnerWhite() {
  return <div style={spinnerWhiteStyle} />;
}

const sidebarStyle = {
  width: '280px',
  flexShrink: 0,
  height: '100%',
  borderRight: '1px solid var(--border-color)',
  padding: '24px',
  display: 'flex',
  flexDirection: 'column',
  gap: '24px',
  zIndex: 10,
  overflowY: 'auto'
};

const sectionTitleStyle = {
  fontSize: '0.875rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-secondary)',
  marginBottom: '16px'
};

const fieldInputSectionStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
};

const uploadButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  width: '100%',
  padding: '12px',
  backgroundColor: 'transparent',
  border: '1px dashed var(--accent-color)',
  color: 'var(--accent-color)',
  borderRadius: '8px',
  cursor: 'pointer',
  fontWeight: 500
};

const loadedFieldStyle = {
  background: 'rgba(34, 197, 94, 0.1)',
  border: '1px solid rgba(34, 197, 94, 0.3)',
  borderRadius: '8px',
  padding: '12px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px'
};

const rowBetweenStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
};

const loadedTitleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  color: 'var(--status-healthy)',
  fontWeight: 500,
  fontSize: '0.85rem'
};

const iconButtonStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--text-secondary)',
  padding: '2px'
};

const ellipsisStyle = {
  color: 'var(--text-primary)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap'
};

const successTextStyle = {
  color: 'var(--status-healthy)',
  fontSize: '0.7rem'
};

const errorTextStyle = {
  color: 'var(--status-critical)',
  fontSize: '0.7rem'
};

const mutedSmallTextStyle = {
  color: 'var(--text-secondary)',
  fontSize: '0.7rem'
};

const smallLabelStyle = {
  fontSize: '0.85rem',
  color: 'var(--text-secondary)'
};

const helperTextStyle = {
  color: 'var(--text-secondary)',
  fontSize: '0.76rem',
  lineHeight: 1.5
};

const inputStyle = {
  width: '100%',
  padding: '10px',
  backgroundColor: 'rgba(0,0,0,0.2)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  borderRadius: '8px',
  outline: 'none',
  fontSize: '0.85rem',
  boxSizing: 'border-box'
};

const secondaryActionButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  width: '100%',
  padding: '12px',
  backgroundColor: 'transparent',
  border: '1px solid var(--accent-color)',
  color: 'var(--accent-color)',
  borderRadius: '8px',
  fontWeight: 600
};

const runButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  width: '100%',
  padding: '12px',
  border: 'none',
  color: 'white',
  borderRadius: '8px',
  fontWeight: 600
};

const primaryActionButtonStyle = {
  width: '100%',
  padding: '10px',
  backgroundColor: 'var(--accent-color)',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 700
};

const lockedNoticeStyle = {
  padding: '12px',
  borderRadius: '8px',
  background: 'rgba(148, 163, 184, 0.08)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-secondary)',
  fontSize: '0.82rem',
  lineHeight: 1.5
};

const teamRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: '8px',
  alignItems: 'center',
  padding: '10px',
  borderRadius: '10px',
  background: 'rgba(255,255,255,0.035)',
  border: '1px solid var(--border-color)'
};

const smallDangerButtonStyle = {
  padding: '6px 8px',
  borderRadius: '8px',
  border: '1px solid rgba(239,68,68,0.45)',
  color: '#fca5a5',
  background: 'rgba(239,68,68,0.08)',
  cursor: 'pointer',
  fontSize: '0.72rem'
};

const checkboxLabelStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  cursor: 'pointer',
  fontSize: '0.9rem'
};

const checkboxStyle = {
  width: '16px',
  height: '16px',
  accentColor: 'var(--accent-color)'
};

const layerTextStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  color: 'var(--text-primary)'
};

const spinnerMiniStyle = {
  width: '16px',
  height: '16px',
  border: '2px solid rgba(59, 130, 246, 0.3)',
  borderTop: '2px solid var(--accent-color)',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite'
};

const spinnerWhiteStyle = {
  width: '16px',
  height: '16px',
  border: '2px solid rgba(255,255,255,0.3)',
  borderTop: '2px solid white',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite'
};
