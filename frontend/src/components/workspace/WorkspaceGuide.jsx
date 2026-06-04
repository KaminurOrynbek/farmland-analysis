import React, { useEffect, useMemo, useState } from 'react';

const steps = [
  {
    title: 'Step 1 — Season',
    text: 'Start here. Open the Period dropdown and choose the current season, previous season, or a custom date range. If you choose custom dates, set the start and end date below.',
    targetGroups: [
      ['[data-guide="season-mode-select"]'],
      ['[data-guide="season-date-selection"]']
    ],
    placement: 'right',
    button: 'OK, next'
  },
  {
    title: 'Step 2 — Upload boundary',
    text: 'If you already have a field file, click Upload GeoJSON here and choose a .geojson or .json boundary.',
    targetGroups: [['[data-guide="upload-geojson"]']],
    placement: 'right',
    button: 'OK, next'
  },
  {
    title: 'Step 3 — Draw boundary',
    text: 'If you want to draw instead, use the polygon or rectangle tools in the top-left corner of the map. These are the exact drawing controls for creating a new field boundary.',
    targetGroups: [
      ['[data-guide="draw-polygon-control"]', '[data-guide="draw-rectangle-control"]'],
      ['[data-guide="draw-toolbar"]'],
      ['[data-guide="draw-on-map"]']
    ],
    placement: 'bottom',
    button: 'OK, next'
  },
  {
    title: 'Step 4 — Field details',
    text: 'Give the field a name, then save it. Uploaded boundaries are saved here, while drawn boundaries ask for the name right after drawing.',
    targetGroups: [
      ['[data-guide="field-name"]', '[data-guide="save-field"]'],
      ['[data-guide="field-details-section"]']
    ],
    placement: 'right',
    button: 'OK, next',
    forceScroll: true
  },
  {
    title: 'Step 5 — Satellite data',
    text: 'Fetch satellite metadata for the selected field and analysis period before running analysis.',
    targetGroups: [
      ['[data-guide="satellite-source"]', '[data-guide="fetch-satellite"]'],
      ['[data-guide="fetch-satellite"]'],
      ['[data-guide="satellite-data-section"]']
    ],
    placement: 'right',
    button: 'OK, next',
    forceScroll: true
  },
  {
    title: 'Step 6 — Run analysis',
    text: 'Run the analysis after the field is saved and satellite metadata is ready.',
    targetGroups: [
      ['[data-guide="run-analysis"]'],
      ['[data-guide="run-analysis-section"]']
    ],
    placement: 'right',
    button: 'OK, next'
  },
  {
    title: 'Step 7 — Selected field',
    text: 'Use this card to review the saved field, switch tabs, and follow the next action.',
    targetGroups: [['[data-guide="selected-field-section"]']],
    placement: 'right',
    button: 'OK, next'
  },
  {
    title: 'Step 8 — Field comments',
    text: 'Open the Comments tab in the selected-field panel to review or add saved-field notes.',
    targetGroups: [
      ['[data-guide="field-comments"]'],
      ['[data-guide="selected-field-section"]']
    ],
    placement: 'right',
    button: 'OK, next',
    targetTab: 'comments',
    forceScroll: true
  },
  {
    title: 'Step 9 — View results',
    text: 'Return to Overview and open Analysis Results when a field result is ready.',
    targetGroups: [
      ['[data-guide="open-report"]'],
      ['[data-guide="run-analysis-section"]'],
      ['[data-guide="selected-field-section"]']
    ],
    placement: 'right',
    button: 'Finish guide',
    targetTab: 'overview',
    forceScroll: true
  }
];

const TOOLTIP_WIDTH = 340;
const TOOLTIP_GAP = 18;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const getStepTargetElements = (stepConfig) => {
  const targetGroups = Array.isArray(stepConfig?.targetGroups) && stepConfig.targetGroups.length
    ? stepConfig.targetGroups
    : [stepConfig?.selectors || []];

  for (const selectors of targetGroups) {
    const elements = selectors
      .map((selector) => document.querySelector(selector))
      .filter(Boolean);

    if (elements.length === selectors.length && elements.length > 0) {
      return elements;
    }
  }

  return [];
};

const getCombinedRect = (elements = []) => {
  if (!elements.length) {
    return null;
  }

  return elements.reduce((combinedRect, element) => {
    const rect = element.getBoundingClientRect();

    if (!combinedRect) {
      return {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        right: rect.right,
        bottom: rect.bottom
      };
    }

    const top = Math.min(combinedRect.top, rect.top);
    const left = Math.min(combinedRect.left, rect.left);
    const right = Math.max(combinedRect.right, rect.right);
    const bottom = Math.max(combinedRect.bottom, rect.bottom);

    return {
      top,
      left,
      width: right - left,
      height: bottom - top,
      right,
      bottom
    };
  }, null);
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

const isRectVisible = (rect, margin = 24) => {
  if (!rect) {
    return false;
  }

  return (
    rect.top >= margin &&
    rect.bottom <= window.innerHeight - margin &&
    rect.left >= margin &&
    rect.right <= window.innerWidth - margin
  );
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
      const targets = getStepTargetElements(step);
      const rect = getCombinedRect(targets);

      if (!rect) {
        setTargetRect(null);
        return;
      }

      setTargetRect(rect);
    };

    updateTargetRect();
    window.addEventListener('resize', updateTargetRect);
    window.addEventListener('scroll', updateTargetRect, true);

    return () => {
      window.removeEventListener('resize', updateTargetRect);
      window.removeEventListener('scroll', updateTargetRect, true);
    };
  }, [activePage, isOpen, step]);

  useEffect(() => {
    if (!isOpen || activePage !== 'Workspace') {
      return undefined;
    }

    let isCancelled = false;
    let animationFrameId = 0;
    let timeoutId = 0;

    const syncTarget = (attempt = 0) => {
      if (isCancelled) {
        return;
      }

      const targets = getStepTargetElements(step);
      const rect = getCombinedRect(targets);
      const visibilityMargin = step?.forceScroll ? 120 : 24;

      if (!targets.length || !rect) {
        if (attempt < 10) {
          animationFrameId = window.requestAnimationFrame(() => syncTarget(attempt + 1));
        }
        return;
      }

      setTargetRect(rect);

      if (!isRectVisible(rect, visibilityMargin)) {
        const scrollTarget = targets[targets.length - 1];

        scrollTarget?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });

        if (attempt < 4) {
          timeoutId = window.setTimeout(() => syncTarget(attempt + 1), 180);
        }
      }
    };

    syncTarget();

    return () => {
      isCancelled = true;
      window.cancelAnimationFrame(animationFrameId);
      window.clearTimeout(timeoutId);
    };
  }, [activePage, isOpen, step, stepIndex]);

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
            boxShadow: '0 0 0 9999px var(--surface-contrast-soft)',
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
          background: 'var(--surface-elevated-strong)',
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
                    : 'var(--border-soft)'
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
              background: 'var(--surface-elevated-strong)',
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
              background: 'var(--surface-elevated-strong)',
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
              background: 'var(--surface-elevated-strong)',
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
