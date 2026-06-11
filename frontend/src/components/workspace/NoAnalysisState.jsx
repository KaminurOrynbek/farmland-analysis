import React from 'react';
import { ArrowRight, ClipboardList } from 'lucide-react';
import { t } from '../../i18n.js';

export default function NoAnalysisState({
  title = t('No analysis available yet'),
  description = t('Select or save a field, then run analysis when imagery is ready.'),
  primaryAction,
  secondaryAction
}) {
  return (
    <section className="glass-panel workspace-empty-state">
      <div className="workspace-section-heading">
        <div className="workspace-section-icon">
          <ClipboardList size={18} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.12rem' }}>{title}</h2>
          <p className="workspace-helper-text" style={{ marginTop: '8px' }}>
            {description}
          </p>
        </div>
      </div>

      {(primaryAction || secondaryAction) && (
        <div className="page-hero-actions">
          {primaryAction ? (
            <button type="button" className="primary-btn" onClick={primaryAction.onClick}>
              <ArrowRight size={16} />
              {primaryAction.label}
            </button>
          ) : null}

          {secondaryAction ? (
            <button type="button" className="secondary-btn" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
