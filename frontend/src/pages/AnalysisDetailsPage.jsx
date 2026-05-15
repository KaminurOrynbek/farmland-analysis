import React from 'react';
import {
  Activity,
  BrainCircuit,
  AlertTriangle,
  Sprout,
  ShieldCheck,
  MapPinned
} from 'lucide-react';

const ReportCard = ({ title, value, subtitle, icon, color }) => (
  <div
    style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}
  >
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      <span
        style={{
          color: 'var(--text-secondary)',
          fontSize: '0.9rem'
        }}
      >
        {title}
      </span>

      {React.cloneElement(icon, {
        size: 18,
        color: color
      })}
    </div>

    <div
      style={{
        fontSize: '2rem',
        fontWeight: 700
      }}
    >
      {value}
    </div>

    <div
      style={{
        color: 'var(--text-secondary)',
        fontSize: '0.85rem',
        lineHeight: 1.5
      }}
    >
      {subtitle}
    </div>
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
  const hasAnalysis = analysisStarted && analysisResults.cropType && analysisResults.cropType !== '—';

  if (!hasAnalysis) {
    return (
      <div className="content-page">
        <section className="page-hero glass-panel">
          <div>
            <div className="page-kicker">Analysis Report</div>
            <h1 className="page-title">No analysis report yet</h1>
            <p className="page-subtitle">
              The report page is ready, but it only becomes useful after a field is uploaded or drawn in Workspace and the current analysis pipeline finishes running.
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
      {/* HEADER */}
      <section className="page-hero glass-panel">
        <div>
          <div className="page-kicker">Latest Analysis Report</div>
          <h1 className="page-title">AI Agricultural Analysis Report</h1>
          <p className="page-subtitle">
            Deep analysis of satellite imagery using NDVI, EVI, geospatial processing, and AI-based crop classification.
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

      {/* FIELD INFO */}
      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
          padding: '24px'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '16px'
          }}
        >
          <MapPinned color="var(--accent-color)" />
          <h2 style={{ margin: 0 }}>Field Information</h2>
        </div>

        <div style={{ color: 'var(--text-secondary)' }}>
          <p><strong>Field Name:</strong> {fieldName}</p>
          <p><strong>Analyzed Area:</strong> {analysisResults.analyzedArea}</p>
          <p><strong>Risk Level:</strong> {analysisResults.riskLevel}</p>
          <p><strong>Pipeline Message:</strong> {analysisResults.message || 'Latest report generated from the current analysis session.'}</p>
        </div>
      </div>

      {/* MAIN GRID */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px'
        }}
      >
        <ReportCard
          title="NDVI Index"
          value={analysisResults.ndviValue}
          subtitle="NDVI evaluates vegetation health and photosynthetic activity."
          icon={<Activity />}
          color="#22c55e"
        />

        <ReportCard
          title="EVI Index"
          value={analysisResults.eviValue}
          subtitle="EVI improves vegetation monitoring in dense crop regions."
          icon={<Sprout />}
          color="#3b82f6"
        />

        <ReportCard
          title="Crop Prediction"
          value={analysisResults.cropType}
          subtitle={`AI confidence: ${analysisResults.confidence}`}
          icon={<BrainCircuit />}
          color="#a855f7"
        />

        <ReportCard
          title="Stress Zones"
          value={`${analysisResults.stressZonesCount}`}
          subtitle="Detected low vegetation activity areas requiring inspection."
          icon={<AlertTriangle />}
          color="#ef4444"
        />

        <ReportCard
          title="Vegetation Health"
          value={analysisResults.vegetationHealth}
          subtitle="Overall crop vitality estimated from spectral analysis."
          icon={<ShieldCheck />}
          color="#22c55e"
        />
      </div>

      {/* AI EXPLANATION */}
      <div
        style={{
          background: 'rgba(59,130,246,0.08)',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: '16px',
          padding: '24px'
        }}
      >
        <h2 style={{ marginBottom: '16px' }}>
          AI Interpretation
        </h2>

        <div
          style={{
            color: 'var(--text-secondary)',
            lineHeight: 1.8
          }}
        >
          <p>
            NDVI value of <strong>{analysisResults.ndviValue}</strong>
            {' '}indicates moderate-to-healthy vegetation activity.
          </p>

          <p>
            EVI value of <strong>{analysisResults.eviValue}</strong>
            {' '}confirms vegetation density and reduces atmospheric noise impact.
          </p>

          <p>
            The AI model classified the field as
            {' '}<strong>{analysisResults.cropType}</strong>
            {' '}with confidence of
            {' '}<strong>{analysisResults.confidence}</strong>.
          </p>

          <p>
            Risk assessment level is
            {' '}<strong>{analysisResults.riskLevel}</strong>,
            meaning the field currently shows
            {' '}
            {analysisResults.riskLevel === 'Low'
              ? 'stable vegetation conditions.'
              : 'potential stress indicators requiring inspection.'}
          </p>
        </div>
      </div>

      {/* RECOMMENDATIONS */}
      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px',
          padding: '24px'
        }}
      >
        <h2 style={{ marginBottom: '16px' }}>
          Recommended Actions
        </h2>

        <ul
          style={{
            color: 'var(--text-secondary)',
            lineHeight: 2
          }}
        >
          <li>Inspect detected stress zones in the field.</li>
          <li>Continue monitoring vegetation changes weekly.</li>
          <li>Compare NDVI/EVI trends across time periods.</li>
          <li>Use AI predictions together with agronomic expertise.</li>
        </ul>
      </div>
    </div>
  );
}
