import React, { useMemo } from 'react';
import { CalendarClock, ChevronDown, Satellite } from 'lucide-react';
import { formatWorkspaceDate } from '../../utils/fieldAnalysisUtils';

const CURRENT_YEAR = new Date().getFullYear();

const DEFAULT_OPTIONS = [
  { value: String(CURRENT_YEAR - 1), label: `Season ${CURRENT_YEAR - 1}` },
  { value: String(CURRENT_YEAR), label: `Season ${CURRENT_YEAR}` }
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

  if (compact) {
    return (
      <div className="analysis-period-compact">
        <select
          className="workspace-input analysis-period-select"
          value={selectedMode}
          onChange={handleModeChange}
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
        </select>
      </div>
    );
  }

  if (!isCustom) {
    return null;
  }

}