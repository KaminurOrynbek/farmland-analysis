import React, { useState } from 'react';

const steps = [
  {
    title: 'Step 1 — Define your field',
    text: 'Start by uploading a GeoJSON boundary from the left sidebar. You can also draw a polygon directly on the map using the drawing tools.',
    top: 118,
    left: 300,
    arrow: 'left',
    button: 'OK, next'
  },
  {
    title: 'Drawing option',
    text: 'To draw manually, use the polygon or rectangle tools on the left side of the map.',
    top: 110,
    left: 365,
    arrow: 'left',
    button: 'Got it'
  },
  {
    title: 'Step 2 — Choose satellite source',
    text: 'For this MVP, Sentinel-2 is recommended. Landsat 8-9 has lower spatial resolution. PlanetScope is a high-resolution commercial option shown for demonstration.',
    top: 250,
    left: 300,
    arrow: 'left',
    button: 'OK, next'
  },
  {
    title: 'Step 3 — Fetch imagery',
    text: 'This prepares satellite imagery for the selected field. In the backend, imagery is processed through the analysis pipeline.',
    top: 360,
    left: 300,
    arrow: 'left',
    button: 'OK, next'
  },
  {
    title: 'Step 4 — Run AI analysis',
    text: 'This calculates NDVI and EVI, detects stress zones, and runs ResNet-50 classification for crop and land-use prediction.',
    top: 420,
    left: 300,
    arrow: 'left',
    button: 'OK, next'
  },
  {
    title: 'Step 5 — Open full report',
    text: 'After analysis, open the Analysis Details tab to view NDVI, EVI, crop prediction, risk level, AI explanation, and recommendations.',
    top: 74,
    left: '50%',
    transform: 'translateX(-15%)',
    arrow: 'top',
    button: 'Finish guide'
  }
];

export default function GuidedTour({ activePage, analysisStarted }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  if (!visible || activePage !== 'Workspace' || analysisStarted) {
    return null;
  }

  const step = steps[stepIndex];

  const nextStep = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      setVisible(false);
    }
  };

  const skipGuide = () => {
    setVisible(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 3000,
        pointerEvents: 'none'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: step.top,
          left: step.left,
          transform: step.transform || 'none',
          width: '340px',
          background: 'rgba(15, 23, 42, 0.96)',
          border: '1px solid rgba(59,130,246,0.35)',
          borderRadius: '16px',
          padding: '18px',
          boxShadow: '0 18px 50px rgba(0,0,0,0.45)',
          pointerEvents: 'auto'
        }}
      >
        <div
          style={{
            fontSize: '0.72rem',
            color: 'var(--accent-color)',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '8px'
          }}
        >
          Guided workflow {stepIndex + 1}/{steps.length}
        </div>

        <h3
          style={{
            margin: '0 0 8px',
            fontSize: '1rem'
          }}
        >
          {step.title}
        </h3>

        <p
          style={{
            margin: 0,
            color: 'var(--text-secondary)',
            fontSize: '0.85rem',
            lineHeight: 1.6
          }}
        >
          {step.text}
        </p>

        <div
          style={{
            display: 'flex',
            gap: '6px',
            marginTop: '14px',
            marginBottom: '14px'
          }}
        >
          {steps.map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: '4px',
                borderRadius: '999px',
                background:
                  i <= stepIndex
                    ? 'var(--accent-color)'
                    : 'rgba(255,255,255,0.12)'
              }}
            />
          ))}
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '10px'
          }}
        >
          <button
            onClick={skipGuide}
            style={{
              padding: '9px 12px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
          >
            Skip
          </button>

          <button
            onClick={nextStep}
            style={{
              padding: '9px 14px',
              borderRadius: '8px',
              border: 'none',
              background: 'var(--accent-color)',
              color: 'white',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {step.button}
          </button>
        </div>

        {step.arrow === 'left' && (
          <div
            style={{
              position: 'absolute',
              left: '-9px',
              top: '32px',
              width: '16px',
              height: '16px',
              background: 'rgba(15, 23, 42, 0.96)',
              borderLeft: '1px solid rgba(59,130,246,0.35)',
              borderBottom: '1px solid rgba(59,130,246,0.35)',
              transform: 'rotate(45deg)'
            }}
          />
        )}

        {step.arrow === 'top' && (
          <div
            style={{
              position: 'absolute',
              top: '-9px',
              left: '32px',
              width: '16px',
              height: '16px',
              background: 'rgba(15, 23, 42, 0.96)',
              borderLeft: '1px solid rgba(59,130,246,0.35)',
              borderTop: '1px solid rgba(59,130,246,0.35)',
              transform: 'rotate(45deg)'
            }}
          />
        )}
      </div>
    </div>
  );
}
