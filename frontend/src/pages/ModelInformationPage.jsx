import React from 'react';
import {
  BrainCircuit,
  Satellite,
  Database,
  Activity,
  Layers3,
  ShieldCheck
} from 'lucide-react';

const InfoCard = ({ icon, title, text }) => (
  <div
    style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '14px'
    }}
  >
    <div
      style={{
        width: '42px',
        height: '42px',
        borderRadius: '10px',
        background: 'rgba(59,130,246,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {icon}
    </div>

    <h3 style={{ margin: 0 }}>
      {title}
    </h3>

    <p
      style={{
        margin: 0,
        color: 'var(--text-secondary)',
        lineHeight: 1.7
      }}
    >
      {text}
    </p>
  </div>
);

export default function ModelInformationPage() {
  return (
    <div
      style={{
        padding: '32px',
        width: '100%',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px'
      }}
    >
      {/* HEADER */}
      <div>
        <h1
          style={{
            fontSize: '2.3rem',
            marginBottom: '10px'
          }}
        >
          AI & Remote Sensing Model
        </h1>

        <p
          style={{
            color: 'var(--text-secondary)',
            maxWidth: '1000px',
            lineHeight: 1.8
          }}
        >
          AgroVision combines satellite imagery, vegetation indices,
          geospatial processing, and deep learning models to analyze
          agricultural land conditions and vegetation health.
        </p>
      </div>

      {/* PIPELINE */}
      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '18px',
          padding: '28px'
        }}
      >
        <h2 style={{ marginBottom: '20px' }}>
          AI Processing Pipeline
        </h2>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '14px',
            alignItems: 'center'
          }}
        >
          {[
            'Field Boundary',
            'Sentinel-2 Imagery',
            'Raster Clipping',
            'NDVI / EVI',
            'ResNet-50 Inference',
            'Risk Assessment',
            'AI Insights'
          ].map((step, index) => (
            <React.Fragment key={step}>
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: 'rgba(59,130,246,0.12)',
                  border: '1px solid rgba(59,130,246,0.18)',
                  fontWeight: 500
                }}
              >
                {step}
              </div>

              {index !== 6 && (
                <div
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '1.2rem'
                  }}
                >
                  →
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* MAIN GRID */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px'
        }}
      >
        <InfoCard
          icon={<Satellite color="#3b82f6" />}
          title="Satellite Data"
          text="Sentinel-2 multispectral imagery is used to monitor vegetation activity, crop density, and field conditions remotely."
        />

        <InfoCard
          icon={<Activity color="#22c55e" />}
          title="NDVI & EVI"
          text="Normalized Difference Vegetation Index (NDVI) and Enhanced Vegetation Index (EVI) are computed to evaluate vegetation health and stress."
        />

        <InfoCard
          icon={<BrainCircuit color="#a855f7" />}
          title="ResNet-50 Transfer Learning"
          text="A pretrained ResNet-50 convolutional neural network is adapted for agricultural land classification using transfer learning techniques."
        />

        <InfoCard
          icon={<Database color="#f59e0b" />}
          title="EuroSAT Dataset"
          text="The AI model is trained using EuroSAT satellite imagery classes including crops, vegetation, residential areas, industrial land, rivers, and forests."
        />

        <InfoCard
          icon={<Layers3 color="#06b6d4" />}
          title="Geospatial Processing"
          text="Rasterio and GeoPandas are used to clip raster imagery by field geometry and process geographic information layers."
        />

        <InfoCard
          icon={<ShieldCheck color="#22c55e" />}
          title="Decision Support"
          text="The platform transforms technical spectral data into understandable agricultural insights and operational recommendations."
        />
      </div>

      {/* MODEL DETAILS */}
      <div
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '18px',
          padding: '28px'
        }}
      >
        <h2 style={{ marginBottom: '20px' }}>
          Technical Stack
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px'
          }}
        >
          <div>
            <h4>Frontend</h4>
            <p style={{ color: 'var(--text-secondary)' }}>
              React, Vite, Leaflet, Lucide Icons
            </p>
          </div>

          <div>
            <h4>Backend</h4>
            <p style={{ color: 'var(--text-secondary)' }}>
              FastAPI, PostgreSQL, SQLAlchemy
            </p>
          </div>

          <div>
            <h4>AI / ML</h4>
            <p style={{ color: 'var(--text-secondary)' }}>
              PyTorch, Torchvision, ResNet-50
            </p>
          </div>

          <div>
            <h4>GIS / Raster</h4>
            <p style={{ color: 'var(--text-secondary)' }}>
              Rasterio, GeoPandas, Google Earth Engine
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}