import React from 'react';
import { Clock3, Leaf, ShieldAlert } from 'lucide-react';
import { formatIndex } from '../../utils/analysisFormatters';
import {
  filterAnalysesBySeason,
  formatWorkspaceDateTime,
  getRiskTone
} from '../../utils/fieldAnalysisUtils';

export default function AnalysisHistoryList({
  items = [],
  selectedSeason,
  emptyText = 'No analyses are stored for this field in the selected season.',
  onItemClick
}) {
  const filteredItems = filterAnalysesBySeason(items, selectedSeason);

  if (!filteredItems.length) {
    return <div className="empty-state compact">{emptyText}</div>;
  }

  return (
    <div className="workspace-timeline-list">
      {filteredItems.map((item) => (
        <button
          key={item.analysisId || item.analysis_id || `${item.fieldId || item.field_id}-${item.analysisDate || item.analysis_date}`}
          type="button"
          className="workspace-timeline-item"
          onClick={() => onItemClick?.(item)}
        >
          <div className="workspace-timeline-main">
            <div>
              <strong>{formatWorkspaceDateTime(item.analysisDate || item.analysis_date, 'Pending date')}</strong>
              <p className="workspace-helper-text">
                {(item.predictedClass || item.predicted_class || 'Land cover unavailable')} · NDVI {formatIndex(item.ndviValue ?? item.ndvi_value)} · EVI {formatIndex(item.eviValue ?? item.evi_value)}
              </p>
            </div>

            <span className={`status-pill ${getRiskTone(item.riskLevel || item.risk_level)}`}>
              <ShieldAlert size={14} />
              {item.riskLevel || item.risk_level || 'Unknown'}
            </span>
          </div>

          <div className="workspace-timeline-meta">
            <span>
              <Clock3 size={13} />
              {item.status || 'Recorded'}
            </span>
            <span>
              <Leaf size={13} />
              Confidence {(item.confidence !== null && item.confidence !== undefined)
                ? `${((Number(item.confidence) <= 1 ? Number(item.confidence) * 100 : Number(item.confidence))).toFixed(1)}%`
                : '—'}
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
