import { formatAreaMeasure } from './analysisFormatters';

export const SEASON_OPTIONS = [
  { value: '2025', label: 'Season 2025' },
  { value: '2026', label: 'Season 2026' }
];

const DEFAULT_RECOMMENDATIONS = [
  'Inspect low-vigor zones in the field and compare them with recent weather or irrigation events.',
  'Check soil moisture, weeds, pests, and fertilizer balance before making major interventions.',
  'Repeat the analysis after the next cloud-free satellite acquisition to confirm the trend.'
];

const toDate = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const average = (values) => {
  if (!values.length) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const normalizeConfidence = (value) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  if (typeof value === 'string') {
    if (value.includes('%')) {
      return value;
    }

    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      return `${numeric.toFixed(1)}%`;
    }

    return value;
  }

  const numeric = Number(value);
  if (Number.isNaN(numeric)) {
    return '—';
  }

  return `${((numeric <= 1 ? numeric * 100 : numeric)).toFixed(1)}%`;
};

export const formatWorkspaceDateTime = (value, fallback = '—') => {
  const parsed = toDate(value);
  return parsed ? parsed.toLocaleString() : fallback;
};

export const getAnalysisYear = (analysis) => {
  const parsed = toDate(analysis?.analysis_date);
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
    const rightTime = toDate(right?.analysis_date)?.getTime() || 0;
    const leftTime = toDate(left?.analysis_date)?.getTime() || 0;
    return rightTime - leftTime;
  })
);

export const filterAnalysesBySeason = (items = [], season) => (
  sortAnalysesByNewest(items.filter((item) => matchesSeason(item, season)))
);

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
      Number(
        selectedField?.properties?.area ||
        selectedField?.properties?.area_ha ||
        selectedField?.area_ha ||
        0
      ) || 0,
    role:
      selectedField?.properties?.role ||
      selectedField?.role ||
      null,
    owner_name: selectedField?.properties?.owner_name || selectedField?.owner_name || null,
    owner_email: selectedField?.properties?.owner_email || selectedField?.owner_email || null
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
  return 'Unknown';
};

export const getVegetationLevelDisplay = (ndviValue) => {
  if (ndviValue === null || ndviValue === undefined || Number.isNaN(Number(ndviValue))) {
    return {
      value: 'Unknown',
      helper: 'Vegetation level will appear after analysis.'
    };
  }

  const numeric = Number(ndviValue);

  if (numeric >= 0.6) {
    return {
      value: 'High',
      helper: 'Strong vegetation signal in the latest screening result.'
    };
  }

  if (numeric >= 0.35) {
    return {
      value: 'Moderate',
      helper: 'Mixed vegetation signal; field inspection recommended.'
    };
  }

  return {
    value: 'Low',
    helper: 'Lower vegetation signal detected; field inspection recommended.'
  };
};

export const getVegetationIndexLevelDisplay = (indexType, value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return {
      value: 'Unknown',
      tone: 'neutral',
      helper: `${indexType.toUpperCase()} level will appear after analysis.`
    };
  }

  const numeric = Number(value);

  if (indexType === 'evi') {
    if (numeric >= 0.45) {
      return {
        value: 'High',
        tone: 'healthy',
        helper: 'Strong canopy signal in the latest screening result.'
      };
    }

    if (numeric >= 0.2) {
      return {
        value: 'Moderate',
        tone: 'warning',
        helper: 'Moderate canopy signal; field inspection recommended.'
      };
    }

    return {
      value: 'Low',
      tone: 'critical',
      helper: 'Lower canopy signal detected; field inspection recommended.'
    };
  }

  if (numeric >= 0.6) {
    return {
      value: 'High',
      tone: 'healthy',
      helper: 'Strong greenness signal in the latest screening result.'
    };
  }

  if (numeric >= 0.35) {
    return {
      value: 'Moderate',
      tone: 'warning',
      helper: 'Mixed greenness signal; field inspection recommended.'
    };
  }

  return {
    value: 'Low',
    tone: 'critical',
    helper: 'Lower greenness signal detected; field inspection recommended.'
  };
};

export const getConditionSummaryDisplay = (analysisSummary) => {
  if (!analysisSummary) {
    return {
      value: 'Unknown',
      helper: 'No screening result is available yet.'
    };
  }

  if (analysisSummary.overallStatus && analysisSummary.overallStatus !== 'Unknown') {
    return {
      value: analysisSummary.overallStatus,
      helper: 'Remote-sensing screening summary for the current field.'
    };
  }

  if (analysisSummary.riskLevel === 'Low') {
    return {
      value: 'Stable',
      helper: 'Current signals look relatively stable, but field inspection is still recommended.'
    };
  }

  if (analysisSummary.riskLevel === 'Medium') {
    return {
      value: 'Needs attention',
      helper: 'Some signals need closer review in the field.'
    };
  }

  if (analysisSummary.riskLevel === 'High') {
    return {
      value: 'Priority review',
      helper: 'Higher-risk signals were detected; field inspection recommended.'
    };
  }

  return {
    value: 'Unknown',
    helper: 'Analysis details are incomplete for this field.'
  };
};

export const getRecommendedActionSummary = (recommendations = []) => {
  if (recommendations.length > 0) {
    return recommendations[0];
  }

  return 'Field inspection recommended to confirm current conditions before action.';
};

const extractRecommendations = (analysisLike) => {
  const direct = Array.isArray(analysisLike?.recommendations)
    ? analysisLike.recommendations
    : [];
  const nested = Array.isArray(analysisLike?.assessment?.recommendations)
    ? analysisLike.assessment.recommendations
    : [];

  const values = direct.length ? direct : nested;
  return values.length ? values : DEFAULT_RECOMMENDATIONS;
};

const buildAssessmentCopy = (analysisLike) => (
  analysisLike?.assessment?.summary ||
  analysisLike?.assessment?.stress_assessment ||
  analysisLike?.assessment?.vegetation_description ||
  analysisLike?.message ||
  ''
);

export const buildHistoryAnalysisDisplay = (analysisItem) => {
  if (!analysisItem) {
    return null;
  }

  return {
    analysisId: analysisItem.analysis_id || null,
    analysisDate: analysisItem.analysis_date || null,
    cropType: analysisItem.crop_type || 'Unknown crop',
    confidenceLabel: normalizeConfidence(analysisItem.confidence),
    ndviValue:
      analysisItem.ndvi_value !== null && analysisItem.ndvi_value !== undefined
        ? Number(analysisItem.ndvi_value)
        : null,
    eviValue:
      analysisItem.evi_value !== null && analysisItem.evi_value !== undefined
        ? Number(analysisItem.evi_value)
        : null,
    riskLevel: analysisItem.risk_level || 'Unknown',
    overallStatus: analysisItem?.assessment?.overall_status || mapRiskToStatus(analysisItem.risk_level),
    recommendations: extractRecommendations(analysisItem),
    summary: buildAssessmentCopy(analysisItem),
    analyzedArea:
      analysisItem.area_ha !== null && analysisItem.area_ha !== undefined
        ? formatAreaMeasure(Number(analysisItem.area_ha))
        : '—',
    stressZonesCount: Number(analysisItem.stress_zones_count || 0),
    stressAreaPercentage: Number(analysisItem.stress_area_percentage || 0)
  };
};

export const buildSessionAnalysisDisplay = (analysisResults, latestAnalysisAt = null) => {
  if (!analysisResults?.analysisId && !analysisResults?.cropType && !analysisResults?.riskLevel) {
    return null;
  }

  return {
    analysisId: analysisResults.analysisId || null,
    analysisDate: latestAnalysisAt || null,
    cropType: analysisResults.cropType || 'Unknown crop',
    confidenceLabel: normalizeConfidence(analysisResults.confidence),
    ndviValue:
      analysisResults.ndviValue !== null && analysisResults.ndviValue !== undefined
        ? Number(analysisResults.ndviValue)
        : null,
    eviValue:
      analysisResults.eviValue !== null && analysisResults.eviValue !== undefined
        ? Number(analysisResults.eviValue)
        : null,
    riskLevel: analysisResults.riskLevel || 'Unknown',
    overallStatus: analysisResults.overallStatus || mapRiskToStatus(analysisResults.riskLevel),
    recommendations: extractRecommendations(analysisResults),
    summary: buildAssessmentCopy(analysisResults),
    analyzedArea: analysisResults.analyzedArea || '—',
    stressZonesCount: Number(analysisResults.stressZonesCount || 0),
    stressAreaPercentage: Number(analysisResults.stressAreaPercentage || 0)
  };
};

export const getActiveAnalysisDisplay = ({
  analysisStarted,
  analysisResults,
  latestAnalysisAt,
  fallbackHistoryAnalysis
}) => {
  if (analysisStarted && (analysisResults?.analysisId || analysisResults?.cropType !== '—')) {
    return buildSessionAnalysisDisplay(analysisResults, latestAnalysisAt);
  }

  return buildHistoryAnalysisDisplay(fallbackHistoryAnalysis);
};

export const buildFieldWorkspaceSummaries = (fields = [], history = [], selectedSeason = null) => {
  const groupedHistory = history.reduce((accumulator, analysisItem) => {
    const fieldKey = analysisItem?.field_id || analysisItem?.field_name;
    if (!fieldKey) {
      return accumulator;
    }

    if (!accumulator[fieldKey]) {
      accumulator[fieldKey] = [];
    }

    accumulator[fieldKey].push(analysisItem);
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
      .map((item) => item?.ndvi_value)
      .filter((value) => value !== null && value !== undefined)
      .map(Number);

    return {
      field,
      analyses: fieldAnalyses,
      seasonAnalyses,
      latestOverallAnalysis,
      latestSeasonAnalysis,
      latestAnalysis,
      latestRisk: latestAnalysis?.risk_level || latestOverallAnalysis?.risk_level || null,
      latestNdvi:
        latestAnalysis?.ndvi_value !== null && latestAnalysis?.ndvi_value !== undefined
          ? Number(latestAnalysis.ndvi_value)
          : latestOverallAnalysis?.ndvi_value !== null && latestOverallAnalysis?.ndvi_value !== undefined
            ? Number(latestOverallAnalysis.ndvi_value)
            : null,
      averageNdvi: average(ndviSeries),
      latestAnalysisAt: latestAnalysis?.analysis_date || latestOverallAnalysis?.analysis_date || null
    };
  });
};
