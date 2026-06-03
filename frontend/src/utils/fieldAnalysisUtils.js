import { formatAreaMeasure } from './analysisFormatters';

export const ANALYSIS_LIMITATION_NOTE =
  'This result is based on satellite indicators and model-assisted land-cover classification. It should support field monitoring, not replace agronomic inspection.';

export const getCurrentSeasonYear = () => String(new Date().getFullYear());

export const SEASON_OPTIONS = [
  { value: '2025', label: 'Season 2025' },
  { value: '2026', label: 'Season 2026' }
];

const CUSTOM_SEASON_OPTION = {
  value: 'custom',
  label: 'Custom date range'
};

const toDate = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const toOptionalNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const average = (values) => {
  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const getPresetDateRange = (seasonYear) => ({
  startDate: `${seasonYear}-01-01`,
  endDate: `${seasonYear}-12-31`
});

export const createSeasonSelection = (
  mode = getCurrentSeasonYear(),
  overrides = {}
) => {
  const normalizedMode = String(mode || getCurrentSeasonYear());
  const inferredSeasonYear =
    overrides.seasonYear ||
    (normalizedMode === 'custom'
      ? getCurrentSeasonYear()
      : normalizedMode);
  const presetRange = getPresetDateRange(inferredSeasonYear);

  return {
    mode: normalizedMode,
    seasonYear: String(inferredSeasonYear),
    startDate: overrides.startDate || presetRange.startDate,
    endDate: overrides.endDate || presetRange.endDate
  };
};

export const buildSeasonOptions = (items = [], includeCustom = false) => {
  const seasonValues = new Set([
    '2025',
    '2026',
    getCurrentSeasonYear()
  ]);

  items.forEach((item) => {
    const nextSeason = getAnalysisYear(item);
    if (nextSeason) {
      seasonValues.add(String(nextSeason));
    }
  });

  const dynamicOptions = Array.from(seasonValues)
    .sort((left, right) => Number(right) - Number(left))
    .map((value) => ({
      value,
      label: `Season ${value}`
    }));

  return includeCustom
    ? [...dynamicOptions, CUSTOM_SEASON_OPTION]
    : dynamicOptions;
};

export const normalizeConfidence = (value, fallback = '—') => {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'string' && value.includes('%')) {
    return value;
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return fallback;
  }

  const percentage = numeric <= 1 ? numeric * 100 : numeric;
  return `${percentage.toFixed(1)}%`;
};

export const formatWorkspaceDateTime = (value, fallback = '—') => {
  const parsed = toDate(value);
  return parsed ? parsed.toLocaleString() : fallback;
};

export const formatWorkspaceDate = (value, fallback = '—') => {
  const parsed = toDate(value);
  return parsed ? parsed.toLocaleDateString() : fallback;
};

export const getAnalysisYear = (analysis) => {
  if (analysis?.season_year || analysis?.seasonYear) {
    return String(analysis.season_year || analysis.seasonYear);
  }

  const parsed =
    toDate(analysis?.analysis_date) ||
    toDate(analysis?.analysisDate) ||
    toDate(analysis?.start_date) ||
    toDate(analysis?.startDate);

  return parsed ? String(parsed.getFullYear()) : null;
};

export const matchesSeason = (analysis, season) => {
  if (!season) {
    return true;
  }

  return getAnalysisYear(analysis) === String(season);
};

export const sortAnalysesByNewest = (items = []) => (
  [...items].sort((left, right) => {
    const rightTime =
      toDate(right?.analysis_date)?.getTime() ||
      toDate(right?.analysisDate)?.getTime() ||
      0;
    const leftTime =
      toDate(left?.analysis_date)?.getTime() ||
      toDate(left?.analysisDate)?.getTime() ||
      0;
    return rightTime - leftTime;
  })
);

export const filterAnalysesBySeason = (items = [], season) => (
  sortAnalysesByNewest(items.filter((item) => matchesSeason(item, season)))
);

export const normalizeAnalysisRecord = (record = {}) => {
  const predictedClass =
    record?.predicted_class ||
    record?.predictedClass ||
    record?.eurosat_class ||
    record?.euroSatClass ||
    record?.crop_type ||
    record?.cropType ||
    null;
  const qualityFlags = Array.isArray(record?.quality_flags)
    ? record.quality_flags
    : Array.isArray(record?.qualityFlags)
      ? record.qualityFlags
      : null;
  const fieldMetadata = record?.field_metadata || record?.fieldMetadata || {};

  return {
    analysisId: record?.analysis_id || record?.analysisId || null,
    fieldId: record?.field_id || record?.fieldId || null,
    fieldName: record?.field_name || record?.fieldName || null,
    areaHectares:
      toOptionalNumber(record?.area_ha) ??
      toOptionalNumber(record?.areaHectares),
    analysisDate:
      record?.analysis_date ||
      record?.analysisDate ||
      record?.analysis_created_at ||
      null,
    analysisCreatedAt:
      record?.analysis_created_at ||
      record?.analysisCreatedAt ||
      null,
    seasonYear: String(
      record?.season_year ||
      record?.seasonYear ||
      getAnalysisYear(record) ||
      getCurrentSeasonYear()
    ),
    startDate: record?.start_date || record?.startDate || null,
    endDate: record?.end_date || record?.endDate || null,
    satelliteAcquisitionDate:
      record?.satellite_acquisition_date ||
      record?.satelliteAcquisitionDate ||
      null,
    satelliteSource:
      record?.satellite_source ||
      record?.satelliteSource ||
      null,
    ndviValue:
      toOptionalNumber(record?.ndvi_value) ??
      toOptionalNumber(record?.ndviValue),
    eviValue:
      toOptionalNumber(record?.evi_value) ??
      toOptionalNumber(record?.eviValue),
    predictedClass,
    euroSatClass:
      record?.eurosat_class ||
      record?.euroSatClass ||
      predictedClass,
    confidence:
      toOptionalNumber(record?.confidence) ??
      toOptionalNumber(record?.modelConfidence),
    confidenceLabel: normalizeConfidence(record?.confidence ?? record?.modelConfidence),
    riskLevel: record?.risk_level || record?.riskLevel || null,
    status: record?.status || null,
    cloudCoverage:
      toOptionalNumber(record?.cloud_coverage) ??
      toOptionalNumber(record?.cloudCoverage),
    qualityFlags,
    fieldMetadata: {
      cropType: fieldMetadata?.crop_type || fieldMetadata?.cropType || null,
      plantingDate: fieldMetadata?.planting_date || fieldMetadata?.plantingDate || null,
      seasonYear: fieldMetadata?.season_year || fieldMetadata?.seasonYear || null
    }
  };
};

export const createEmptyAnalysisRecord = () => normalizeAnalysisRecord({
  analysisId: null,
  status: 'idle',
  seasonYear: getCurrentSeasonYear()
});

export const getFieldSelectionId = (selectedField) => (
  selectedField?.properties?.field_id ||
  selectedField?.properties?.id ||
  selectedField?.id ||
  null
);

export const getFieldSelectionName = (selectedField) => (
  selectedField?.properties?.name ||
  selectedField?.name ||
  'Unnamed Field'
);

export const createFieldFallbackRecord = (selectedField, currentFieldId = null) => {
  if (!selectedField) {
    return null;
  }

  return {
    id: currentFieldId || getFieldSelectionId(selectedField) || 'current-selection',
    name: getFieldSelectionName(selectedField),
    area_ha:
      toOptionalNumber(
        selectedField?.properties?.area ||
        selectedField?.properties?.area_ha ||
        selectedField?.area_ha
      ) || 0,
    role: selectedField?.properties?.role || selectedField?.role || null,
    owner_name: selectedField?.properties?.owner_name || selectedField?.owner_name || null,
    owner_email: selectedField?.properties?.owner_email || selectedField?.owner_email || null,
    crop_type: selectedField?.properties?.crop_type || selectedField?.crop_type || null,
    planting_date: selectedField?.properties?.planting_date || selectedField?.planting_date || null,
    season_year: selectedField?.properties?.season_year || selectedField?.season_year || null
  };
};

export const getRiskTone = (riskLevel) => {
  if (riskLevel === 'Low') return 'healthy';
  if (riskLevel === 'Medium') return 'warning';
  if (riskLevel === 'High') return 'critical';
  return 'neutral';
};

export const getRiskColor = (riskLevel) => {
  if (riskLevel === 'Low') return 'var(--status-healthy)';
  if (riskLevel === 'Medium') return 'var(--status-warning)';
  if (riskLevel === 'High') return 'var(--status-critical)';
  return 'var(--text-secondary)';
};

export const mapRiskToStatus = (riskLevel) => {
  if (riskLevel === 'Low') return 'Healthy';
  if (riskLevel === 'Medium') return 'Warning';
  if (riskLevel === 'High') return 'Critical';
  return 'Not analyzed';
};

export const getVegetationLevelDisplay = (ndviValue) => {
  if (ndviValue === null || ndviValue === undefined || Number.isNaN(Number(ndviValue))) {
    return {
      value: 'Not analyzed',
      helper: 'Vegetation signal will appear after analysis.'
    };
  }

  const numeric = Number(ndviValue);

  if (numeric >= 0.6) {
    return {
      value: 'High',
      helper: 'Strong vegetation signal in the selected monitoring window.'
    };
  }

  if (numeric >= 0.35) {
    return {
      value: 'Moderate',
      helper: 'Moderate vegetation signal. Field inspection recommended.'
    };
  }

  return {
    value: 'Low',
    helper: 'Lower vegetation signal detected. Field inspection recommended.'
  };
};

export const getVegetationIndexLevelDisplay = (indexType, value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return {
      value: 'Not analyzed',
      tone: 'neutral',
      helper: `${indexType.toUpperCase()} is not available for this run.`
    };
  }

  const numeric = Number(value);

  if (indexType === 'evi') {
    if (numeric >= 0.45) {
      return {
        value: 'High',
        tone: 'healthy',
        helper: 'Higher canopy signal detected in the selected image window.'
      };
    }

    if (numeric >= 0.2) {
      return {
        value: 'Moderate',
        tone: 'warning',
        helper: 'Moderate canopy signal. Field inspection recommended.'
      };
    }

    return {
      value: 'Low',
      tone: 'critical',
      helper: 'Lower canopy signal detected. Field inspection recommended.'
    };
  }

  if (numeric >= 0.6) {
    return {
      value: 'High',
      tone: 'healthy',
      helper: 'Higher greenness signal detected in the selected image window.'
    };
  }

  if (numeric >= 0.35) {
    return {
      value: 'Moderate',
      tone: 'warning',
      helper: 'Moderate greenness signal. Field inspection recommended.'
    };
  }

  return {
    value: 'Low',
    tone: 'critical',
    helper: 'Lower greenness signal detected. Field inspection recommended.'
  };
};

export const getConditionSummaryDisplay = (analysisSummary) => {
  if (!analysisSummary?.analysisId) {
    return {
      value: 'Not analyzed',
      helper: 'Run an analysis to view a remote-sensing screening result.'
    };
  }

  const fieldCondition = mapRiskToStatus(analysisSummary.riskLevel);

  if (fieldCondition === 'Healthy') {
    return {
      value: fieldCondition,
      helper: 'Lower screening priority in the current result. Continue routine monitoring.'
    };
  }

  if (fieldCondition === 'Warning') {
    return {
      value: fieldCondition,
      helper: 'Mixed signals detected. Field inspection recommended.'
    };
  }

  if (fieldCondition === 'Critical') {
    return {
      value: fieldCondition,
      helper: 'Higher screening priority detected. Field inspection recommended.'
    };
  }

  return {
    value: 'Not analyzed',
    helper: 'Run an analysis to view a remote-sensing screening result.'
  };
};

export const getInspectionMessage = (analysisSummary) => {
  const condition = mapRiskToStatus(analysisSummary?.riskLevel);

  if (condition === 'Healthy') {
    return 'Remote-sensing screening result indicates lower current priority. Continue monitoring and inspect if field conditions change.';
  }

  if (condition === 'Warning') {
    return 'Remote-sensing screening result indicates mixed signals. Field inspection recommended.';
  }

  if (condition === 'Critical') {
    return 'Remote-sensing screening result indicates higher screening priority. Field inspection recommended.';
  }

  return 'Remote-sensing screening result is not available yet.';
};

export const buildHistoryAnalysisDisplay = (analysisItem) => (
  analysisItem ? normalizeAnalysisRecord(analysisItem) : null
);

export const buildSessionAnalysisDisplay = (analysisResults, latestAnalysisAt = null) => {
  if (!analysisResults?.analysisId && !analysisResults?.predictedClass) {
    return null;
  }

  return normalizeAnalysisRecord({
    ...analysisResults,
    analysisDate: latestAnalysisAt || analysisResults.analysisDate
  });
};

export const getActiveAnalysisDisplay = ({
  analysisStarted,
  analysisResults,
  latestAnalysisAt,
  fallbackHistoryAnalysis
}) => {
  if (analysisStarted && (analysisResults?.analysisId || analysisResults?.predictedClass)) {
    return buildSessionAnalysisDisplay(analysisResults, latestAnalysisAt);
  }

  return buildHistoryAnalysisDisplay(fallbackHistoryAnalysis);
};

export const buildFieldWorkspaceSummaries = (fields = [], history = [], selectedSeason = null) => {
  const groupedHistory = history.reduce((accumulator, analysisItem) => {
    const fieldKey = analysisItem?.field_id || analysisItem?.fieldId || analysisItem?.field_name;
    if (!fieldKey) {
      return accumulator;
    }

    if (!accumulator[fieldKey]) {
      accumulator[fieldKey] = [];
    }

    accumulator[fieldKey].push(normalizeAnalysisRecord(analysisItem));
    return accumulator;
  }, {});

  return fields.map((field) => {
    const fieldAnalyses = sortAnalysesByNewest(
      groupedHistory[field.id] ||
      groupedHistory[field.name] ||
      []
    );
    const seasonAnalyses = filterAnalysesBySeason(fieldAnalyses, selectedSeason);
    const activeAnalyses = seasonAnalyses.length ? seasonAnalyses : fieldAnalyses;
    const latestOverallAnalysis = fieldAnalyses[0] || null;
    const latestSeasonAnalysis = seasonAnalyses[0] || null;
    const latestAnalysis = activeAnalyses[0] || null;
    const ndviSeries = activeAnalyses
      .map((item) => item?.ndviValue)
      .filter((value) => value !== null && value !== undefined)
      .map(Number);

    return {
      field,
      analyses: fieldAnalyses,
      seasonAnalyses,
      latestOverallAnalysis,
      latestSeasonAnalysis,
      latestAnalysis,
      latestRisk: latestAnalysis?.riskLevel || latestOverallAnalysis?.riskLevel || null,
      latestClassification:
        latestAnalysis?.predictedClass ||
        latestOverallAnalysis?.predictedClass ||
        null,
      latestNdvi:
        latestAnalysis?.ndviValue ??
        latestOverallAnalysis?.ndviValue ??
        null,
      averageNdvi: average(ndviSeries),
      latestAnalysisAt: latestAnalysis?.analysisDate || latestOverallAnalysis?.analysisDate || null
    };
  });
};

export const formatFieldSeason = (field) => (
  field?.season_year ? `Season ${field.season_year}` : 'Season not set'
);

export const formatFieldPlantingDate = (field) => (
  formatWorkspaceDate(field?.planting_date || field?.plantingDate, 'Planting date not set')
);

export const formatFieldCropType = (field) => (
  field?.crop_type || field?.cropType || 'Crop type not set'
);

export const formatAreaSummary = (value) => (
  value !== null && value !== undefined ? formatAreaMeasure(value) : '—'
);
