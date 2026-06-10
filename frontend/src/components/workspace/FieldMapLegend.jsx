import React from 'react';

const LEGEND_ITEMS = [
  { label: 'Low risk', color: 'var(--status-healthy)' },
  { label: 'Medium risk', color: 'var(--status-warning)' },
  { label: 'High risk', color: 'var(--status-critical)' },
  { label: 'Not analyzed', color: 'var(--text-secondary)' }
];

export default function MapLegend({ mode = 'priority' }) {
  if (mode === 'analysis') {
    return (
      <div className="map-legend glass-panel map-legend-gradient map-legend-risk">
        <strong className="map-legend-title">Risk colors</strong>

        <div className="map-risk-gradient-bar" />

        <div className="map-gradient-scale">
          <span>Low</span>
          <span>Medium</span>
          <span>High</span>
        </div>

        <div className="map-risk-not-analyzed">
          <span className="map-legend-swatch" style={{ background: 'var(--text-secondary)' }} />
          <span>Not analyzed</span>
        </div>
      </div>
    );
  }

  return (
    <div className="map-legend glass-panel">
      <strong className="map-legend-title">Map legend</strong>

      <div className="map-legend-items">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.label} className="map-legend-item">
            <span className="map-legend-swatch" style={{ background: item.color }} />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
