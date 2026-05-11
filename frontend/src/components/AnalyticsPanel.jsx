import React from 'react';
import { Activity, Tractor, Maximize2, AlertTriangle, Map as MapIcon, Database } from 'lucide-react';

const Card = ({ title, value, icon, subtext, color = 'var(--accent-color)' }) => (
  <div style={{
    background: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-secondary)' }}>
      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{title}</span>
      {React.cloneElement(icon, { size: 16, color })}
    </div>
    <div style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
      {value}
    </div>
    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
      {subtext}
    </div>
  </div>
);

export default function AnalyticsPanel({ analysisResults, isAnalyzing, selectedField }) {
  // Graceful fallback values in case analysisResults hasn't populated
  const data = analysisResults || {};
  const props = selectedField?.properties || {};
  const hasResults = data && data.cropType && data.cropType !== "—";

  return (
    <aside className="glass-panel" style={{
      width: '320px',
      flexShrink: 0,
      height: '100%',
      borderLeft: '1px solid var(--border-color)',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      zIndex: 10,
      overflowY: 'auto',
      transition: 'opacity 0.3s ease',
      opacity: isAnalyzing ? 0.6 : 1
    }}>
      <div>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {selectedField && !hasResults ? (
            <>
              <MapIcon size={18} color="var(--accent-color)" />
              {props.name || props.field_id || `Field ${props.id}`} Details
            </>
          ) : (
            <>
              <Database size={18} color="var(--accent-color)" />
              Dashboard Aggregate
            </>
          )}
        </h2>
        
        {selectedField && !hasResults ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Card 
              title="Parcel Area" 
              value={props.area ? `${props.area} ha` : "Unknown"}
              icon={<Maximize2 />} 
              subtext="Estimated field bounds"
              color="var(--accent-color)"
            />
            <Card 
              title="Vegetation Health" 
              value={props.health || "Pending Scan"} 
              icon={<Activity />} 
              subtext={`NDVI: ${props.ndvi || "—"}`}              
              color={props.health === 'Poor' ? "var(--status-critical)" : (props.health ? "var(--status-healthy)" : "var(--text-secondary)")}
            />
            <Card 
              title="Crop Classification" 
              value={props.crop || props.cropType || "Unknown"} 
              icon={<Tractor />} 
              subtext="AI Top Prediction"
              color="#a855f7"
            />
            <Card 
              title="Risk Level" 
              value={props.health === 'Poor' ? "High" : (props.health ? "Low" : "Unknown")} 
              icon={<AlertTriangle />} 
              subtext={props.health === 'Poor' ? "Requires immediate attention" : "No anomalies detected"}
              color={props.health === 'Poor' ? "var(--status-critical)" : (props.health ? "var(--status-healthy)" : "var(--text-secondary)")}
            />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Card 
              title="Avg Vegetation Health" 
              value={data.vegetationHealth || "—"} 
              icon={<Activity />} 
              subtext={`${data.healthDelta || ""} vs last scan (NDVI: ${data.ndviValue || "—"})`}
              color="var(--status-healthy)"
            />
            <Card 
              title="Primary Crop Type" 
              value={data.cropType || "—"} 
              icon={<Tractor />} 
              subtext={`Confidence: ${data.confidence || "—"}`}
              color="#a855f7"
            />
            <Card 
              title="Analyzed Area" 
              value={data.analyzedArea || "—"} 
              icon={<Maximize2 />} 
              subtext={`Across ${data.fieldCount || 0} distinct field parcels`}
              color="var(--accent-color)"
            />
            <Card 
              title="Stress Detected" 
              value={data.stressZonesCount ? `${data.stressZonesCount} Zones` : "0 Zones"} 
              icon={<AlertTriangle />} 
              subtext={`Risk: ${data.riskLevel || "Unknown"} (NDVI: ${data.ndviValue || "—"})`}
              color={data.stressZonesCount > 0 ? "var(--status-critical)" : "var(--status-healthy)"}
            />
          </div>
        )}
      </div>

      <div style={{ height: '1px', background: 'var(--border-color)' }} />

      <div>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>Map Legend</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'var(--status-healthy)' }}></div>
            <span style={{ fontSize: '0.85rem' }}>Healthy Vegetation (NDVI &gt; 0.6)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'var(--status-warning)' }}></div>
            <span style={{ fontSize: '0.85rem' }}>Moderate Stress (NDVI 0.3 - 0.6)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'var(--status-critical)' }}></div>
            <span style={{ fontSize: '0.85rem' }}>Severe Stress / Bare Soil (NDVI &lt; 0.3)</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
