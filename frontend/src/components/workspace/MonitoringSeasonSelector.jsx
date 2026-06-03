import React, { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();

const DEFAULT_OPTIONS = [
  { value: String(CURRENT_YEAR), label: 'Season current year' },
  { value: String(CURRENT_YEAR - 1), label: 'Season previous year' }
];

const getSelectedMode = (value) => {
  if (typeof value === 'object' && value !== null) {
    return value.mode === 'custom' ? 'custom' : String(value.seasonYear || CURRENT_YEAR);
  }

  return String(value || CURRENT_YEAR);
};

const buildSelection = (mode, currentValue = {}) => {
  const current = typeof currentValue === 'object' && currentValue !== null ? currentValue : {};

  if (mode === 'custom') {
    const seasonYear = String(current.seasonYear || CURRENT_YEAR);

    return {
      mode: 'custom',
      seasonYear,
      startDate: current.startDate || `${seasonYear}-01-01`,
      endDate: current.endDate || `${seasonYear}-12-31`
    };
  }

  return {
    mode,
    seasonYear: String(mode),
    startDate: `${mode}-01-01`,
    endDate: `${mode}-12-31`
  };
};

export default function MonitoringSeasonSelector({
  value,
  onChange,
  options = DEFAULT_OPTIONS,
  allowCustom = false,
  compact = false
}) {
  const selectedMode = getSelectedMode(value);

  const selection = useMemo(
    () => (typeof value === 'object' && value !== null ? value : buildSelection(selectedMode, value)),
    [selectedMode, value]
  );

  const isCustom = selectedMode === 'custom';

  const handleModeChange = (event) => {
    const nextMode = event.target.value;
    const nextSelection = buildSelection(nextMode, selection);

    if (compact) {
      onChange?.(nextSelection.seasonYear);
      return;
    }

    onChange?.(nextSelection);
  };

  const handleDateChange = (key, nextDate) => {
    const nextSelection = {
      ...selection,
      mode: 'custom',
      [key]: nextDate
    };

    const nextYear = nextSelection.startDate
      ? new Date(nextSelection.startDate).getFullYear()
      : CURRENT_YEAR;

    onChange?.({
      ...nextSelection,
      seasonYear: String(nextYear)
    });
  };

  return (
    <section className="analysis-period-card" data-guide="season-date-selection">
      <label className="analysis-period-field">
        {!compact ? <span>Period</span> : null}

        <div className="analysis-period-select-wrap">
          <select
            value={selectedMode}
            onChange={handleModeChange}
            className="analysis-period-native-select"
          >
            {options.map((option) => {
              const optionValue = String(option.value || option);
              const optionLabel = option.label || `Season ${optionValue}`;

              return (
                <option key={optionValue} value={optionValue}>
                  {optionLabel}
                </option>
              );
            })}

            {allowCustom ? <option value="custom">Custom date range</option> : null}
          </select>

          <ChevronDown size={16} />
        </div>
      </label>

      {!compact ? (
        <p className="analysis-period-helper">
          {isCustom
            ? 'Used to search satellite imagery for the selected dates.'
            : 'Used to search satellite imagery for this year.'}
        </p>
      ) : null}

      {isCustom && !compact ? (
        <div className="analysis-period-date-grid">
          <label className="analysis-period-field">
            <span>Start date</span>
            <input
              type="date"
              value={selection.startDate || ''}
              onChange={(event) => handleDateChange('startDate', event.target.value)}
            />
          </label>

          <label className="analysis-period-field">
            <span>End date</span>
            <input
              type="date"
              value={selection.endDate || ''}
              onChange={(event) => handleDateChange('endDate', event.target.value)}
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}
