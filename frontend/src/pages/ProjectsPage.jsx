import React, { useEffect, useState } from 'react';
import { Database, AlertTriangle, Leaf } from 'lucide-react';
import { fetchAllFields, fetchAnalysisHistory } from '../api';

export default function ProjectsPage() {
  const [fields, setFields] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProjectsData = async () => {
      try {
        const fieldsResponse = await fetchAllFields();
        const historyResponse = await fetchAnalysisHistory();

        setFields(fieldsResponse.data || []);
        setHistory(historyResponse.data || []);
      } catch (error) {
        console.error('Failed to load projects data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProjectsData();
  }, []);

  const riskColor = (risk) => {
    if (risk === 'Low') return 'var(--status-healthy)';
    if (risk === 'Medium') return 'var(--status-warning)';
    if (risk === 'High') return 'var(--status-critical)';
    return 'var(--text-secondary)';
  };

  return (
    <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
      <h2 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>Projects & Analysis History</h2>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
        View saved field boundaries and previously completed satellite image analyses.
      </p>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading projects...</p>
      ) : (
        <>
          <section style={{ marginBottom: '32px' }}>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Database size={18} /> Saved Fields
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
              {fields.map((field) => (
                <div key={field.id} className="glass-panel" style={{ padding: '18px', borderRadius: '12px' }}>
                  <h4>{field.name}</h4>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '8px' }}>
                    Area: {field.area_ha ? `${field.area_ha.toFixed(2)} ha` : 'Unknown'}
                  </p>
                  <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '0.8rem' }}>
                    ID: {field.id.slice(0, 8)}...
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Leaf size={18} /> Recent Analyses
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {history.map((item) => (
                <div key={item.analysis_id} className="glass-panel" style={{
                  padding: '16px',
                  borderRadius: '12px',
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 1fr 1fr 1fr',
                  gap: '16px',
                  alignItems: 'center'
                }}>
                  <div>
                    <strong>{item.field_name}</strong>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                      {new Date(item.analysis_date).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Class</span>
                    <p>{item.crop_type || '—'}</p>
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>NDVI / EVI</span>
                    <p>
                      {item.ndvi_value !== null && item.ndvi_value !== undefined ? item.ndvi_value.toFixed(2) : '—'} / {item.evi_value !== null && item.evi_value !== undefined ? item.evi_value.toFixed(2) : '—'}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: riskColor(item.risk_level) }}>
                    <AlertTriangle size={16} />
                    <strong>{item.risk_level || 'Unknown'}</strong>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}