import React, { useEffect, useState } from 'react';
import { Database, AlertTriangle, Leaf, BarChart2, TrendingUp, Plus, MapPin } from 'lucide-react';
import { fetchAllFields, fetchAnalysisHistory } from '../api';

const formatDateTime = (value) => {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString();
};

export default function ProjectsPage({ onNavigate, refreshKey }) {
  const [fields, setFields] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const loadProjectsData = async () => {
      const [fieldsResponse, historyResponse] = await Promise.allSettled([
        fetchAllFields(),
        fetchAnalysisHistory()
      ]);

      if (!isActive) {
        return;
      }

      if (fieldsResponse.status === 'fulfilled') {
        setFields(fieldsResponse.value.data || []);
      }

      if (historyResponse.status === 'fulfilled') {
        const sortedHistory = [...(historyResponse.value.data || [])].sort(
          (left, right) => new Date(right.analysis_date) - new Date(left.analysis_date)
        );
        setHistory(sortedHistory);
      }

      setLoading(false);
    };

    loadProjectsData();

    return () => {
      isActive = false;
    };
  }, [refreshKey]);

  const riskColor = (risk) => {
    if (risk === 'Low') return 'var(--status-healthy)';
    if (risk === 'Medium') return 'var(--status-warning)';
    if (risk === 'High') return 'var(--status-critical)';
    return 'var(--text-secondary)';
  };

  // Computed summary metrics — NDVI average ignores null/undefined entries
  const highRisk = history.filter(h => h.risk_level === 'High').length;
  const validNdvi = history.map(h => h.ndvi_value).filter(v => v !== null && v !== undefined);
  const avgNdvi = validNdvi.length
    ? (validNdvi.reduce((s, v) => s + v, 0) / validNdvi.length).toFixed(3)
    : '—';

  // Field lookup by UUID — avoids fragile name matching
  const fieldMap = Object.fromEntries(fields.map(f => [f.id, f]));

  const summaryCards = [
    { label: 'Saved Fields',    value: fields.length,  icon: <MapPin size={20} />,        color: 'var(--accent-color)' },
    { label: 'Total Analyses',  value: history.length, icon: <BarChart2 size={20} />,      color: '#8b5cf6' },
    { label: 'High Risk Fields',value: highRisk,        icon: <AlertTriangle size={20} />,  color: 'var(--status-critical)' },
    { label: 'Average NDVI',    value: avgNdvi,         icon: <TrendingUp size={20} />,     color: 'var(--status-healthy)' },
  ];

  return (
    <div className="content-page">

      {/* ── Page header ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '4px' }}>
            Projects & Analysis History
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            View saved field boundaries and completed satellite image analyses.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('Workspace')}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'var(--accent-color)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            backgroundColor: 'var(--accent-color)',
            border: 'none',
            borderRadius: '8px',
            color: 'white',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
            transition: 'all 0.2s',
            flexShrink: 0
          }}
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-secondary)', textAlign: 'center', paddingTop: '60px' }}>
          Loading...
        </div>
      ) : (
        <>
          {/* ── Summary cards ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px',
            marginBottom: '36px'
          }}>
            {summaryCards.map(card => (
              <div key={card.label} className="summary-card glass-panel" style={{ padding: '20px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <p style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.72rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: '8px'
                    }}>
                      {card.label}
                    </p>
                    <p style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                      {card.value}
                    </p>
                  </div>
                  <div style={{ color: card.color, opacity: 0.85, marginTop: '2px' }}>
                    {card.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ── Saved Fields ── */}
          <section style={{ marginBottom: '36px' }}>
            <h3 style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--text-primary)'
            }}>
              <Database size={15} style={{ color: 'var(--accent-color)' }} />
              Saved Fields
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                ({fields.length})
              </span>
            </h3>

            {fields.length === 0 ? (
              <div className="empty-state">No fields saved yet</div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '12px'
              }}>
                {fields.map(field => (
                  <div key={field.id} className="field-card-sm glass-panel" style={{ padding: '14px 16px', borderRadius: '10px' }}>
                    <p style={{
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      marginBottom: '6px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {field.name}
                    </p>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {field.area_ha ? `${field.area_ha.toFixed(2)} ha` : 'Area unknown'}
                    </p>
                    <p style={{
                      color: 'var(--text-secondary)',
                      fontSize: '0.7rem',
                      marginTop: '4px',
                      fontFamily: 'monospace',
                      opacity: 0.7
                    }}>
                      {field.id.slice(0, 8)}…
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Recent Analyses table ── */}
          <section>
            <h3 style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--text-primary)'
            }}>
              <Leaf size={15} style={{ color: 'var(--status-healthy)' }} />
              Recent Analyses
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                ({history.length})
              </span>
            </h3>

            {history.length === 0 ? (
              <div className="empty-state">No analyses yet</div>
            ) : (
              <div className="table-wrapper">
                <table className="projects-table">
                  <thead>
                    <tr>
                      <th>Field Name</th>
                      <th>Area</th>
                      <th>Crop Type</th>
                      <th>NDVI</th>
                      <th>EVI</th>
                      <th>Risk</th>
                      <th>Analysis Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(item => {
                      const matchedField = fieldMap[item.field_id];
                      return (
                        <tr key={item.analysis_id}>
                          <td style={{ fontWeight: 500 }}>{item.field_name || '—'}</td>
                          <td>
                            {matchedField?.area_ha
                              ? `${matchedField.area_ha.toFixed(2)} ha`
                              : '—'}
                          </td>
                          <td>{item.crop_type || '—'}</td>
                          <td>
                            {item.ndvi_value !== null && item.ndvi_value !== undefined
                              ? item.ndvi_value.toFixed(3)
                              : '—'}
                          </td>
                          <td>
                            {item.evi_value !== null && item.evi_value !== undefined
                              ? item.evi_value.toFixed(3)
                              : '—'}
                          </td>
                          <td>
                            <span
                              className="risk-badge"
                              style={{
                                backgroundColor: `${riskColor(item.risk_level)}22`,
                                color: riskColor(item.risk_level),
                                border: `1px solid ${riskColor(item.risk_level)}55`
                              }}
                            >
                              {item.risk_level || 'Unknown'}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                            {formatDateTime(item.analysis_date)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
