import React from 'react';

const LEGEND_ITEMS = [
  { label: 'Low risk / healthy', color: 'var(--status-healthy)' },
  { label: 'Medium risk / warning', color: 'var(--status-warning)' },
  { label: 'High risk / critical', color: 'var(--status-critical)' },
  { label: 'Not analyzed', color: 'var(--text-secondary)' }
];

export default function MapLegend() {
  return (
    <div className="map-legend glass-panel">
      <strong style={{ fontSize: '0.86rem' }}>Map legend</strong>

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
