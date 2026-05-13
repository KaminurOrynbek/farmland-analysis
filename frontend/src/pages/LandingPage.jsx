import React from 'react';
import { Leaf, Satellite, BarChart2, BrainCircuit, MapPin, ChevronRight } from 'lucide-react';

const AUTH_ALERT = () => alert('Authentication will be added in the next version.');

const STEPS = [
  { n: 1, title: 'Define Field Boundaries', desc: 'Draw or upload GeoJSON polygons to mark your agricultural fields on the map.' },
  { n: 2, title: 'Fetch Sentinel-2 Imagery', desc: 'Pull multispectral satellite images for your field area via Google Earth Engine.' },
  { n: 3, title: 'Calculate NDVI & EVI', desc: 'Compute vegetation indices from near-infrared and red bands using Rasterio.' },
  { n: 4, title: 'Run ResNet-50 Classification', desc: 'Apply a transfer-learning model trained on crop patterns to classify field health.' },
  { n: 5, title: 'View Health & Risk Insights', desc: 'Receive a full risk report with vegetation health score and stress zone detection.' },
];

const FEATURES = [
  {
    icon: <Satellite size={28} color="var(--accent-color)" />,
    title: 'Satellite & Geodata',
    desc: 'Sentinel-2 multispectral imagery processed via Google Earth Engine. Define precise field boundaries with GeoJSON.',
  },
  {
    icon: <BarChart2 size={28} color="var(--status-healthy)" />,
    title: 'Vegetation Indices',
    desc: 'NDVI and EVI computed per field boundary using Rasterio, giving quantitative measures of canopy health.',
  },
  {
    icon: <BrainCircuit size={28} color="#a855f7" />,
    title: 'Transfer Learning AI',
    desc: 'ResNet-50 fine-tuned on agricultural patterns classifies crop type and detects vegetation stress zones.',
  },
];

export default function LandingPage({ onStart }) {
  return (
    <div className="landing-page">
      {/* ── Nav ── */}
      <nav className="landing-nav">
        <div className="landing-nav-brand">
          <div className="landing-logo-box">
            <Leaf size={20} color="var(--accent-color)" />
          </div>
          <span className="landing-brand-name">AgroVision</span>
        </div>
        <div className="landing-nav-actions">
          <button className="landing-btn-ghost" onClick={AUTH_ALERT}>Sign In</button>
          <button className="landing-btn-outline" onClick={AUTH_ALERT}>Get Started</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="landing-hero">
        <div className="landing-hero-inner">
          <div className="landing-hero-badge">
            <MapPin size={13} />
            <span>Satellite · AI · Agronomy</span>
          </div>
          <h1 className="landing-headline">
            AI-Powered<br />Farmland Analysis
          </h1>
          <p className="landing-subheadline">
            Define field boundaries, fetch Sentinel-2 imagery, calculate NDVI&nbsp;/&nbsp;EVI,
            and run ResNet-50 classification — all in one place.
          </p>
          <div className="landing-cta-row">
            <button className="landing-btn-primary" onClick={onStart}>
              Start Monitoring <ChevronRight size={16} style={{ marginLeft: 4, verticalAlign: 'middle' }} />
            </button>
            <button className="landing-btn-secondary" onClick={onStart}>
              View Demo
            </button>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="landing-section">
        <p className="landing-section-label">Workflow</p>
        <h2 className="landing-section-title">How It Works</h2>
        <div className="landing-steps">
          {STEPS.map(({ n, title, desc }) => (
            <div key={n} className="landing-step-card glass-panel">
              <div className="landing-step-number">{n}</div>
              <h3 className="landing-step-title">{title}</h3>
              <p className="landing-step-desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section className="landing-section landing-section-alt">
        <p className="landing-section-label">Capabilities</p>
        <h2 className="landing-section-title">What You Get</h2>
        <div className="landing-features">
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="landing-feature-card glass-panel">
              <div className="landing-feature-icon">{icon}</div>
              <h3 className="landing-feature-title">{title}</h3>
              <p className="landing-feature-desc">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <div className="landing-tech">
        <p>
          Built with&nbsp;
          {['FastAPI', 'React', 'PostgreSQL', 'Google Earth Engine', 'Rasterio', 'PyTorch', 'ResNet-50']
            .join(' · ')}
        </p>
      </div>

      {/* ── Footer ── */}
      <footer className="landing-footer">
        <p className="landing-footer-title">AgroVision</p>
        <p className="landing-footer-sub">
          Diploma project: Developing a Web Service for Analyzing Farmland Images
          Using Transfer Learning and Geodata
        </p>
        <p className="landing-footer-copy">© 2025</p>
      </footer>
    </div>
  );
}
