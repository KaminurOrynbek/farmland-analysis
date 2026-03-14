import React, { useRef } from 'react';
import { Upload, Play, Layers, Map as MapIcon, Settings, X, Image as ImageIcon } from 'lucide-react';

export default function Sidebar({ 
  uploadedImage, 
  setUploadedImage, 
  overlayVisible, 
  setOverlayVisible, 
  overlayOpacity, 
  setOverlayOpacity,
  isAnalyzing,
  onRunAnalysis,
  geoJsonData,
  setGeoJsonData,
  geoJsonMeta,
  setGeoJsonMeta,
  fieldLayerVisible,
  setFieldLayerVisible,
  setSelectedField
}) {
  const fileInputRef = useRef(null);
  const geoJsonInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
      const url = URL.createObjectURL(file);
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      setUploadedImage({
        url,
        name: file.name,
        size: sizeMB
      });
    }
  };

  const handleRemoveImage = () => {
    if (uploadedImage && uploadedImage.url) {
      URL.revokeObjectURL(uploadedImage.url);
    }
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleGeoJsonUpload = (e) => {
    const file = e.target.files[0];
    if (file && (file.name.endsWith('.geojson') || file.name.endsWith('.json'))) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const json = JSON.parse(event.target.result);
          setGeoJsonData(json);
          setGeoJsonMeta({
            name: file.name,
            size: (file.size / 1024).toFixed(1) // KB
          });
        } catch (error) {
          console.error("Error parsing GeoJSON", error);
          alert("Invalid GeoJSON file");
        }
      };
      reader.readAsText(file);
    }
  };

  const handleRemoveGeoJson = () => {
    setGeoJsonData(null);
    setGeoJsonMeta(null);
    setSelectedField(null);
    if (geoJsonInputRef.current) {
      geoJsonInputRef.current.value = "";
    }
  };

  return (
    <aside className="glass-panel" style={{
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
    }}>
      <div>
        <h2 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Data Input
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <input 
            type="file" 
            accept=".jpg,.jpeg,.png"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />

          {!uploadedImage ? (
            <button 
              onClick={() => fileInputRef.current?.click()}
              style={{
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
                fontWeight: 500,
                transition: 'background 0.2s'
              }}>
              <Upload size={18} />
              Upload Satellite Image
            </button>
          ) : (
            <div style={{
              background: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              <div style={{ position: 'relative', width: '100%', height: '120px', borderRadius: '4px', overflow: 'hidden' }}>
                <img 
                  src={uploadedImage.url} 
                  alt="Satellite Preview" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                />
                <button 
                  onClick={handleRemoveImage}
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    background: 'rgba(0,0,0,0.6)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'white'
                  }}
                >
                  <X size={14} />
                </button>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <div style={{ color: 'var(--text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {uploadedImage.name}
                </div>
                <div>{uploadedImage.size} MB</div>
              </div>
            </div>
          )}

          <div style={{ height: '1px', background: 'var(--border-color)', margin: '8px 0' }} />

          <input 
            type="file" 
            accept=".geojson,.json"
            ref={geoJsonInputRef}
            onChange={handleGeoJsonUpload}
            style={{ display: 'none' }}
          />

          {!geoJsonData ? (
            <button 
              onClick={() => geoJsonInputRef.current?.click()}
              style={{
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
                fontWeight: 500,
                transition: 'background 0.2s'
              }}>
              <Upload size={18} />
              Upload GeoJSON Bounds
            </button>
          ) : (
            <div style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              borderRadius: '8px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-healthy)', fontWeight: 500, fontSize: '0.85rem' }}>
                  <MapIcon size={16} />
                  Field bounds loaded
                </div>
                <button 
                  onClick={handleRemoveGeoJson}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                    padding: '2px'
                  }}
                >
                  <X size={14} />
                </button>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <div style={{ color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {geoJsonMeta?.name}
                </div>
                <div>{geoJsonMeta?.size} KB</div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
            <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Dataset Selector</label>
            <select style={{
              width: '100%',
              padding: '10px',
              backgroundColor: 'rgba(0,0,0,0.2)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              borderRadius: '6px',
              outline: 'none'
            }}>
              <option>Sentinel-2 (Optical)</option>
              <option>Landsat 8</option>
              <option>PlanetScope</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ height: '1px', background: 'var(--border-color)' }} />

      <div>
        <h2 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Analysis Engine
        </h2>
        
        <button 
          onClick={onRunAnalysis}
          disabled={isAnalyzing}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            padding: '12px',
            backgroundColor: isAnalyzing ? 'rgba(59, 130, 246, 0.5)' : 'var(--accent-color)',
            border: 'none',
            color: 'white',
            borderRadius: '8px',
            cursor: isAnalyzing ? 'not-allowed' : 'pointer',
            fontWeight: 600,
            boxShadow: isAnalyzing ? 'none' : '0 4px 14px 0 rgba(59, 130, 246, 0.39)',
            transition: 'all 0.2s',
            opacity: isAnalyzing ? 0.7 : 1
          }}
        >
          {isAnalyzing ? (
            <>
              <div style={{
                width: '16px',
                height: '16px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <style>
                {`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}
              </style>
              Running Analysis...
            </>
          ) : (
            <>
              <Play fill="white" size={16} />
              Run Analysis
            </>
          )}
        </button>
      </div>

      <div style={{ height: '1px', background: 'var(--border-color)' }} />

      <div>
        <h2 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '16px' }}>
          Layer Controls
        </h2>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { id: 'base', name: 'Satellite Basemap', icon: <MapIcon size={16} />, active: true },
            { id: 'ndvi', name: 'NDVI Heatmap', icon: <Layers size={16} />, active: true }
          ].map(layer => (
            <label key={layer.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              fontSize: '0.9rem'
            }}>
              <input 
                type="checkbox" 
                defaultChecked={layer.active}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }} 
              />
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: layer.active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                {layer.icon}
                {layer.name}
              </span>
            </label>
          ))}

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            cursor: 'pointer',
            fontSize: '0.9rem'
          }}>
            <input 
              type="checkbox" 
              checked={fieldLayerVisible}
              onChange={(e) => setFieldLayerVisible(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }} 
            />
            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: fieldLayerVisible ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
              <Settings size={16} />
              Field Boundaries
            </span>
          </label>

          {/* New Custom Layer Control for Uploaded Image */}
          {uploadedImage && (
            <div style={{ 
              marginTop: '8px', 
              paddingTop: '12px', 
              borderTop: '1px dashed var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}>
                <input 
                  type="checkbox" 
                  checked={overlayVisible}
                  onChange={(e) => setOverlayVisible(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-color)' }} 
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', color: overlayVisible ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  <ImageIcon size={16} />
                  Custom Map Overlay
                </span>
              </label>

              {overlayVisible && (
                <div style={{ paddingLeft: '28px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Opacity:</span>
                  <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05"
                    value={overlayOpacity}
                    onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                    style={{ flex: 1, accentColor: 'var(--accent-color)' }}
                  />
                  <span style={{ fontSize: '0.75rem', width: '28px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                    {Math.round(overlayOpacity * 100)}%
                  </span>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </aside>
  );
}
