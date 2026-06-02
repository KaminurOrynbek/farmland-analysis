export const formatIndex = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }

  return Number(value).toFixed(2);
};

const toSafeNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

export const formatAreaMeasure = (hectares) => {
  if (hectares === null || hectares === undefined || Number.isNaN(Number(hectares))) {
    return '—';
  }

  const numeric = Number(hectares);

  if (numeric <= 0) {
    return '0 m²';
  }

  if (numeric < 1) {
    return `${Math.round(numeric * 10000).toLocaleString()} m²`;
  }

  return `${numeric.toLocaleString(undefined, {
    minimumFractionDigits: numeric >= 10 ? 1 : 2,
    maximumFractionDigits: numeric >= 10 ? 1 : 2
  })} ha`;
};

const getWeakVegetationSeverity = (percentage) => {
  if (percentage <= 0) {
    return {
      label: 'Clear coverage',
      description: 'No weak vegetation detected',
      tone: 'healthy'
    };
  }

  if (percentage < 5) {
    return {
      label: 'Localized patches',
      description: 'Small isolated weak patches detected',
      tone: 'warning'
    };
  }

  if (percentage < 15) {
    return {
      label: 'Moderate spread',
      description: 'Weak vegetation is present in several areas',
      tone: 'warning'
    };
  }

  return {
    label: 'Wide coverage',
    description: 'A large part of the field shows weak vegetation',
    tone: 'critical'
  };
};

export const getWeakVegetationMetric = (analysisResults) => {
  const percentage = toSafeNumber(analysisResults?.stressAreaPercentage);
  const detections = Math.max(0, Math.round(toSafeNumber(analysisResults?.stressZonesCount)));
  const analyzedAreaHectares = toSafeNumber(analysisResults?.analyzedAreaHectares);
  const estimatedAreaHectares =
    analyzedAreaHectares > 0 ? (analyzedAreaHectares * percentage) / 100 : null;
  const severity = getWeakVegetationSeverity(percentage);
  const detectionText = `${detections.toLocaleString()} low-vegetation detections`;

  const value =
    estimatedAreaHectares === null
      ? `${detections.toLocaleString()} detections`
      : formatAreaMeasure(estimatedAreaHectares);

  if (percentage <= 0 || detections === 0) {
    return {
      value: estimatedAreaHectares === null ? '0 m²' : value,
      subtitle: 'No weak vegetation detected in the latest analysis.',
      percentage,
      detections,
      estimatedAreaHectares,
      ...severity
    };
  }

  const shareText = `${percentage.toFixed(1)}% of the field`;

  return {
    value,
    subtitle:
      estimatedAreaHectares === null
        ? `${severity.description}. Field area is unavailable, so this is shown as ${detectionText}.`
        : `${severity.description} across ${shareText} (${detectionText}).`,
    percentage,
    detections,
    estimatedAreaHectares,
    ...severity
  };
};
