import React from 'react';
import {
  Activity,
  BrainCircuit,
  AlertTriangle,
  Sprout,
  ShieldCheck,
  MapPinned,
  Droplets,
  ClipboardCheck,
  Microscope
} from 'lucide-react';

const statusConfig = {
  Healthy: {
    color: 'var(--status-healthy)',
    title: 'Field looks healthy',
    text: 'The field shows strong vegetation activity. Continue regular monitoring and keep the current crop management plan.'
  },
  Warning: {
    color: 'var(--status-warning)',
    title: 'Field needs attention',
    text: 'Some parts of the field may be under stress. Inspect irrigation, soil moisture, weeds, pests, or fertilizer balance.'
  },
  Critical: {
    color: 'var(--status-critical)',
    title: 'Field requires urgent inspection',
    text: 'The analysis detected serious vegetation stress. Visit the field as soon as possible and check water, soil, disease, and crop damage.'
  },
  Unknown: {
    color: 'var(--text-secondary)',
    title: 'Condition is not clear yet',
    text: 'The system does not have enough completed analysis data to produce a reliable field condition.'
  }
};

const NDVI_LEVELS = [
  {
    label: 'Healthy vegetation',
    range: '> 0.60',
    text: 'Strong green biomass and active plant growth.'
  },
  {
    label: 'Moderate activity',
    range: '0.30 - 0.60',
    text: 'Vegetation is present, but some zones may need attention.'
  },
  {
    label: 'Weak activity',
    range: '< 0.30',
    text: 'Often linked to bare soil, poor growth, or visible stress.'
  }
];

const EVI_LEVELS = [
  {
    label: 'Dense canopy',
    range: '> 0.50',
    text: 'Usually means the crop canopy is strong and active.'
  },
  {
    label: 'Moderate canopy',
    range: '0.25 - 0.50',
    text: 'Crop cover looks present, but keep monitoring changes.'
  },
  {
    label: 'Weak canopy',
    range: '< 0.25',
    text: 'Low vegetation density or a weak crop signal.'
  }
];

const formatIndex = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }

  return Number(value).toFixed(2);
};

const getNdviMeaning = (value) => {
  if (value === null || value === undefined) return 'NDVI is not available yet.';
  if (value >= 0.6) return 'Strong plant growth and healthy green biomass.';
  if (value >= 0.3) return 'Moderate vegetation activity. Some areas may need attention.';
  return 'Weak vegetation activity. This may indicate bare soil, poor growth, or crop stress.';
};

const getEviMeaning = (value) => {
  if (value === null || value === undefined) return 'EVI is not available yet.';
  if (value >= 0.5) return 'Dense and active vegetation. Crop canopy looks strong.';
  if (value >= 0.25) return 'Moderate crop density. Continue monitoring changes.';
  return 'Low crop density or weak vegetation signal.';
};

const getNdviLevelLabel = (value) => {
  if (value === null || value === undefined) return 'Not available';
  if (value >= 0.6) return NDVI_LEVELS[0].label;
  if (value >= 0.3) return NDVI_LEVELS[1].label;
  return NDVI_LEVELS[2].label;
};

const getEviLevelLabel = (value) => {
  if (value === null || value === undefined) return 'Not available';
  if (value >= 0.5) return EVI_LEVELS[0].label;
  if (value >= 0.25) return EVI_LEVELS[1].label;
  return EVI_LEVELS[2].label;
};

const getNdviTone = (value) => {
  if (value === null || value === undefined) return 'neutral';
  if (value >= 0.6) return 'healthy';
  if (value >= 0.3) return 'warning';
  return 'critical';
};

const getEviTone = (value) => {
  if (value === null || value === undefined) return 'neutral';
  if (value >= 0.5) return 'healthy';
  if (value >= 0.25) return 'warning';
  return 'critical';
};

const MetricCard = ({ title, value, subtitle, icon, color }) => (
  <div className="glass-panel" style={metricCardStyle}>
    <div style={metricHeaderStyle}>
      <span style={{ color: 'var(--text-secondary)', fontSize: '0.86rem' }}>{title}</span>
      {React.cloneElement(icon, { size: 18, color })}
    </div>

    <strong style={{ fontSize: '1.9rem' }}>{value}</strong>

    <p style={metricSubtitleStyle}>{subtitle}</p>
  </div>
);

export default function AnalysisDetailsPage({
  analysisResults,
  selectedField,
  analysisStarted,
  latestAnalysisAt,
  onNavigate
}) {
  const fieldName = selectedField?.properties?.name || 'Unnamed Field';
  const hasAnalysis = analysisStarted && analysisResults?.analysisId;
  const condition = analysisResults?.overallStatus || 'Unknown';
  const config = statusConfig[condition] || statusConfig.Unknown;

  const recommendations = analysisResults?.recommendations?.length
    ? analysisResults.recommendations
    : [
        'Inspect areas with weak vegetation signal.',
        'Check irrigation coverage and soil moisture.',
        'Look for pests, weeds, disease, or fertilizer imbalance.',
        'Repeat analysis after several days to compare field changes.'
      ];

  if (!hasAnalysis) {
    return (
      <div className="content-page">
        <section className="page-hero glass-panel">
          <div>
            <div className="page-kicker">Analysis Report</div>
            <h1 className="page-title">No analysis report yet</h1>
            <p className="page-subtitle">
              Upload or draw a field in Workspace, then run analysis to generate a farmer-friendly report.
            </p>
          </div>

          <div className="page-hero-actions">
            <button type="button" className="primary-btn" onClick={() => onNavigate('Workspace')}>
              Open Workspace
            </button>
            <button type="button" className="secondary-btn" onClick={() => onNavigate('Projects')}>
              View Projects
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="content-page">
      <section className="page-hero glass-panel">
        <div>
          <div className="page-kicker">Latest Field Report</div>
          <h1 className="page-title">Field Health Summary</h1>
          <p className="page-subtitle">
            This report translates satellite imagery, vegetation indices, and AI crop prediction into practical field guidance.
          </p>
        </div>

        <div className="page-hero-meta">
          <div className="page-hero-meta-card">
            <span className="page-hero-meta-label">Field</span>
            <strong>{fieldName}</strong>
          </div>

          <div className="page-hero-meta-card">
            <span className="page-hero-meta-label">Latest run</span>
            <strong>{latestAnalysisAt ? new Date(latestAnalysisAt).toLocaleString() : 'Current session'}</strong>
          </div>

          <div className="page-hero-actions">
            <button type="button" className="secondary-btn" onClick={() => onNavigate('Workspace')}>
              Reopen Workspace
            </button>
          </div>
        </div>
      </section>

      <section className="glass-panel" style={{ ...statusCardStyle, borderColor: config.color }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <ShieldCheck color={config.color} size={30} />
          <div>
            <div style={{ color: config.color, fontWeight: 800, textTransform: 'uppercase', fontSize: '0.78rem' }}>
              {condition}
            </div>
            <h2 style={{ margin: '4px 0 0' }}>{config.title}</h2>
          </div>
        </div>

        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginTop: '14px' }}>
          {analysisResults.message || config.text}
        </p>
      </section>

      <div style={gridStyle}>
        <MetricCard
          title="Vegetation Strength"
          value={formatIndex(analysisResults.ndviValue)}
          subtitle={getNdviMeaning(analysisResults.ndviValue)}
          icon={<Activity />}
          color="var(--status-healthy)"
        />

        <MetricCard
          title="Crop Density"
          value={formatIndex(analysisResults.eviValue)}
          subtitle={getEviMeaning(analysisResults.eviValue)}
          icon={<Sprout />}
          color="var(--accent-color)"
        />

        <MetricCard
          title="AI Crop Prediction"
          value={analysisResults.cropType || 'Unknown'}
          subtitle={`Model confidence: ${analysisResults.confidence || '—'}`}
          icon={<BrainCircuit />}
          color="#a855f7"
        />

        <MetricCard
          title="Weak Vegetation Area"
          value={`${Number(analysisResults.stressAreaPercentage || 0).toFixed(1)}%`}
          subtitle={`${analysisResults.stressZonesCount || 0} low-vegetation pixels or zones detected.`}
          icon={<AlertTriangle />}
          color="var(--status-critical)"
        />
      </div>

      <section className="glass-panel" style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <ClipboardCheck color="var(--status-healthy)" />
          <h2 style={{ margin: 0 }}>Recommended Actions</h2>
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          {recommendations.map((item, index) => (
            <div key={`${item}-${index}`} style={recommendationStyle}>
              <span style={numberBadgeStyle}>{index + 1}</span>
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="glass-panel" style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <Droplets color="var(--accent-color)" />
          <h2 style={{ margin: 0 }}>What This Means for the Farmer</h2>
        </div>

        <p style={paragraphStyle}>
          The system checks how actively plants reflect near-infrared and visible light. Strong vegetation usually gives higher NDVI and EVI values.
          If these values are low in some areas, it may mean weak growth, water stress, pests, disease, bare soil, or uneven fertilizer distribution.
        </p>

        <p style={paragraphStyle}>
          The AI crop prediction helps identify the most likely land-cover or crop class from the satellite image.
          This should support field decisions, but final actions should still be confirmed through field inspection.
        </p>
      </section>

      <section className="glass-panel" style={sectionStyle}>
        <div style={sectionTitleStyle}>
          <Microscope color="var(--text-secondary)" />
          <h2 style={{ margin: 0 }}>Technical Details</h2>
        </div>

        <div style={technicalGridStyle}>
          <span>NDVI</span>
          <strong>{formatIndex(analysisResults.ndviValue)}</strong>

          <span>EVI</span>
          <strong>{formatIndex(analysisResults.eviValue)}</strong>

          <span>Risk level</span>
          <strong>{analysisResults.riskLevel || '—'}</strong>

          <span>Analyzed area</span>
          <strong>{analysisResults.analyzedArea || '—'}</strong>

          <span>Analysis ID</span>
          <strong>{analysisResults.analysisId || '—'}</strong>
        </div>

        <div style={indexGuideGridStyle}>
          <div style={indexGuideCardStyle}>
            <div style={indexGuideHeaderStyle}>
              <div>
                <span style={indexGuideLabelStyle}>NDVI meaning</span>
                <strong style={indexGuideValueStyle}>{formatIndex(analysisResults.ndviValue)}</strong>
              </div>
              <span className={`status-pill ${getNdviTone(analysisResults.ndviValue)}`}>
                {getNdviLevelLabel(analysisResults.ndviValue)}
              </span>
            </div>

            <p style={indexGuideSummaryStyle}>{getNdviMeaning(analysisResults.ndviValue)}</p>

            <div style={indexLevelsStyle}>
              {NDVI_LEVELS.map((level) => (
                <div key={level.range} style={indexLevelRowStyle}>
                  <strong>{level.range}</strong>
                  <span>{level.label}: {level.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={indexGuideCardStyle}>
            <div style={indexGuideHeaderStyle}>
              <div>
                <span style={indexGuideLabelStyle}>EVI meaning</span>
                <strong style={indexGuideValueStyle}>{formatIndex(analysisResults.eviValue)}</strong>
              </div>
              <span className={`status-pill ${getEviTone(analysisResults.eviValue)}`}>
                {getEviLevelLabel(analysisResults.eviValue)}
              </span>
            </div>

            <p style={indexGuideSummaryStyle}>{getEviMeaning(analysisResults.eviValue)}</p>

            <div style={indexLevelsStyle}>
              {EVI_LEVELS.map((level) => (
                <div key={level.range} style={indexLevelRowStyle}>
                  <strong>{level.range}</strong>
                  <span>{level.label}: {level.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const metricCardStyle = {
  padding: '20px',
  borderRadius: '18px',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
};

const metricHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between'
};

const metricSubtitleStyle = {
  color: 'var(--text-secondary)',
  fontSize: '0.86rem',
  lineHeight: 1.55,
  margin: 0
};

const statusCardStyle = {
  padding: '24px',
  borderRadius: '22px',
  border: '1px solid'
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
  gap: '18px'
};

const sectionStyle = {
  padding: '24px',
  borderRadius: '22px'
};

const sectionTitleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '16px'
};

const recommendationStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
  padding: '14px',
  borderRadius: '14px',
  background: 'rgba(255,255,255,0.035)',
  color: 'var(--text-secondary)',
  lineHeight: 1.5
};

const numberBadgeStyle = {
  minWidth: '24px',
  height: '24px',
  borderRadius: '999px',
  background: 'var(--accent-color)',
  color: '#fff',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '0.75rem',
  fontWeight: 800
};

const paragraphStyle = {
  color: 'var(--text-secondary)',
  lineHeight: 1.8,
  margin: '0 0 12px'
};

const technicalGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(140px, 220px) 1fr',
  gap: '12px',
  color: 'var(--text-secondary)'
};

const indexGuideGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: '16px',
  marginTop: '22px'
};

const indexGuideCardStyle = {
  padding: '18px',
  borderRadius: '18px',
  border: '1px solid rgba(148, 163, 184, 0.14)',
  background: 'rgba(255,255,255,0.03)',
  display: 'grid',
  gap: '14px'
};

const indexGuideHeaderStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '12px'
};

const indexGuideLabelStyle = {
  display: 'block',
  color: 'var(--text-secondary)',
  fontSize: '0.76rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '6px'
};

const indexGuideValueStyle = {
  fontSize: '1.55rem',
  lineHeight: 1
};

const indexGuideSummaryStyle = {
  margin: 0,
  color: 'var(--text-secondary)',
  lineHeight: 1.6
};

const indexLevelsStyle = {
  display: 'grid',
  gap: '10px'
};

const indexLevelRowStyle = {
  display: 'grid',
  gap: '4px',
  color: 'var(--text-secondary)',
  fontSize: '0.85rem',
  lineHeight: 1.55
};
