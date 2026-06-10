import React from 'react';

export default function FieldMetricCard({
  label,
  value,
  helper,
  icon,
  accentColor = 'var(--accent-color)'
}) {
  return (
    <div className="workspace-metric-card glass-panel">
      <div className="workspace-metric-head">
        <span className="workspace-metric-label">{label}</span>
        {icon ? React.cloneElement(icon, { size: 16, color: accentColor }) : null}
      </div>

      <strong className="workspace-metric-value">{value}</strong>

      {helper ? <p className="workspace-metric-helper">{helper}</p> : null}
    </div>
  );
}
