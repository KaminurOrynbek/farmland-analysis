import React from 'react';
import { CalendarRange } from 'lucide-react';
import { SEASON_OPTIONS } from '../../utils/fieldAnalysisUtils';

export default function SeasonSelector({
  value,
  onChange,
  options = SEASON_OPTIONS,
  helperText = 'Prototype season filter: analyses are grouped by the year of the analysis date.',
  compact = false
}) {
  if (compact) {
    return (
      <div className="season-toggle-group">
        {options.map((option) => {
          const isActive = String(option.value) === String(value);

          return (
            <button
              key={option.value}
              type="button"
              className={`season-toggle ${isActive ? 'active' : ''}`}
              onClick={() => onChange?.(String(option.value))}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="workspace-season-card glass-panel">
      <div className="workspace-section-heading">
        <div className="workspace-section-icon">
          <CalendarRange size={16} />
        </div>
        <div>
          <strong style={{ fontSize: '0.92rem' }}>Season focus</strong>
          <p className="workspace-helper-text">{helperText}</p>
        </div>
      </div>

      <div className="season-toggle-group">
        {options.map((option) => {
          const isActive = String(option.value) === String(value);

          return (
            <button
              key={option.value}
              type="button"
              className={`season-toggle ${isActive ? 'active' : ''}`}
              onClick={() => onChange?.(String(option.value))}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
