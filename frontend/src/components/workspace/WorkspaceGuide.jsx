import React, { useEffect, useMemo, useState } from 'react';

const steps = [
  {
    title: 'Step 1 — Upload GeoJSON',
    text: 'Upload an existing field boundary file when you already have parcel geometry ready.',
    selectors: ['[data-guide="upload-geojson"]', '[data-guide="field-upload-section"]'],
    placement: 'right',
    button: 'OK, next'
  },
  {
    title: 'Step 2 — Draw on the map',
    text: 'Or sketch a field boundary directly on the map with the drawing tools.',
    selectors: ['.leaflet-pm-toolbar[data-guide="draw-on-map"]', '[data-guide="draw-on-map"]'],
    placement: 'right',
    button: 'OK, next'
  },
  {
    title: 'Step 3 — Name and save field',
    text: 'Add the field name, optional field details, and save the field before analysis.',
    selectors: ['[data-guide="field-name"]', '[data-guide="save-field"]', '[data-guide="field-details-section"]'],
    placement: 'right',
    button: 'OK, next'
  },
  {
    title: 'Step 4 — Season and dates',
    text: 'Choose the monitoring season, or switch to a custom date range if needed.',
    selectors: ['[data-guide="season-date-selection"]', '.workspace-season-card'],
    placement: 'right',
    button: 'OK, next'
  },
  {
    title: 'Step 5 — Fetch satellite data',
    text: 'Fetch satellite metadata for the selected season or custom monitoring window.',
    selectors: ['[data-guide="fetch-satellite"]', '[data-guide="fetch-data-section"]'],
    placement: 'right',
    button: 'OK, next'
  },
  {
    title: 'Step 6 — Run analysis',
    text: 'Run the analysis after the field is saved and satellite metadata is ready.',
    selectors: ['[data-guide="run-analysis"]', '[data-guide="run-analysis-section"]'],
    placement: 'right',
    button: 'OK, next'
  },
  {
    title: 'Step 7 — Field comments',
    text: 'Open the Comments tab in the selected-field panel to review or add saved-field notes.',
    selectors: ['[data-guide="field-comments"]', '.workspace-selection-tab.active'],
    placement: 'left',
    button: 'OK, next',
    targetTab: 'comments'
  },
  {
    title: 'Step 8 — Open report',
    text: 'Return to Overview and open Analysis Results when the screening run is ready.',
    selectors: ['[data-guide="open-report"]'],
    placement: 'left',
    button: 'Finish guide',
    targetTab: 'overview'
  }
];

const TOOLTIP_WIDTH = 340;
const TOOLTIP_GAP = 18;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getTargetElement = (selectors = []) => {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      return element;
    }
  }

  return null;
};

const getTooltipPosition = (rect, placement) => {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxLeft = Math.max(16, viewportWidth - TOOLTIP_WIDTH - 16);
  const centeredTop = clamp(rect.top + rect.height / 2 - 120, 16, Math.max(16, viewportHeight - 260));

  if (placement === 'bottom') {
    return {
      top: clamp(rect.bottom + TOOLTIP_GAP, 16, Math.max(16, viewportHeight - 260)),
      left: clamp(rect.left, 16, maxLeft),
      arrow: 'top'
    };
  }

  const fitsRight = rect.right + TOOLTIP_GAP + TOOLTIP_WIDTH <= viewportWidth - 16;

  if (fitsRight) {
    return {
      top: centeredTop,
      left: clamp(rect.right + TOOLTIP_GAP, 16, maxLeft),
      arrow: 'left'
    };
  }

  return {
    top: centeredTop,
    left: clamp(rect.left - TOOLTIP_WIDTH - TOOLTIP_GAP, 16, maxLeft),
    arrow: 'right'
  };
};

export default function GuidedTour({ activePage, isOpen, onClose }) {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  const step = steps[stepIndex];

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setStepIndex(0);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || activePage !== 'Workspace') {
      return undefined;
    }

    const updateTargetRect = () => {
      const target = getTargetElement(step?.selectors);
      if (!target) {
        setTargetRect(null);
        return;
      }

      const rect = target.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom
      });
    };

    updateTargetRect();
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);

    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [activePage, isOpen, step]);

  const tooltipPosition = useMemo(() => {
    if (!targetRect) {
      return {
        top: 120,
        left: 420,
        arrow: 'left'
      };
    }

    return getTooltipPosition(targetRect, step?.placement);
  }, [step, targetRect]);

  if (!isOpen || activePage !== 'Workspace') {
    return null;
  }

  const closeGuide = () => {
    setStepIndex(0);
    setTargetRect(null);
    onClose?.();
  };

  const nextStep = () => {
    const nextIndex = stepIndex + 1;

    if (nextIndex < steps.length) {
      const nextStepConfig = steps[nextIndex];

      if (nextStepConfig?.targetTab) {
        window.dispatchEvent(
          new CustomEvent('workspace-guide-target', {
            detail: { targetTab: nextStepConfig.targetTab }
          })
        );
      }

      setStepIndex(nextIndex);
    } else {
      closeGuide();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 6000,
        pointerEvents: 'none',
        background: 'rgba(2, 6, 23, 0.24)'
      }}
    >
      {targetRect ? (
        <div
          style={{
            position: 'absolute',
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
            borderRadius: '16px',
            border: '2px solid rgba(59,130,246,0.85)',
            boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.28)',
            background: 'transparent'
          }}
        />
      ) : null}

      <div
        style={{
          position: 'absolute',
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          width: `${TOOLTIP_WIDTH}px`,
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
            onClick={closeGuide}
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

        {tooltipPosition.arrow === 'left' ? (
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
        ) : null}

        {tooltipPosition.arrow === 'right' ? (
          <div
            style={{
              position: 'absolute',
              right: '-9px',
              top: '32px',
              width: '16px',
              height: '16px',
              background: 'rgba(15, 23, 42, 0.96)',
              borderRight: '1px solid rgba(59,130,246,0.35)',
              borderTop: '1px solid rgba(59,130,246,0.35)',
              transform: 'rotate(45deg)'
            }}
          />
        ) : null}

        {tooltipPosition.arrow === 'top' ? (
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
        ) : null}
      </div>
    </div>
  );
}
