import React from 'react';
import AgroVisionLogo from '../components/common/AgroVisionLogo';
import ThemeToggleButton from '../components/common/ThemeToggleButton.jsx';
import {
  ArrowRight,
  BrainCircuit,
  ChevronRight,
  Database,
  Leaf,
  LineChart,
  MapPin,
  Satellite,
  ShieldCheck,
  Sprout
} from 'lucide-react';

const NAV_LINKS = [
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How It Works' },
  { id: 'benefits', label: 'Benefits' },
  { id: 'faq', label: 'FAQ' },
  { id: 'contact', label: 'Contact' }
];

const STEPS = [
  {
    n: 1,
    title: 'Add your field',
    desc: 'Upload field boundaries or draw a field directly on the map.'
  },
  {
    n: 2,
    title: 'Review satellite view',
    desc: 'See your field from above and prepare it for analysis.'
  },
  {
    n: 3,
    title: 'Run field analysis',
    desc: 'Run remote-sensing screening based on vegetation indicators and land-cover classification.'
  },
  {
    n: 4,
    title: 'Understand the results',
    desc: 'Review field condition, vegetation signal, and monitoring history in plain language.'
  },
  {
    n: 5,
    title: 'Save and compare results',
    desc: 'Keep previous analyses and track how fields change over time.'
  }
];

const FEATURES = [
  {
    icon: <MapPin size={28} color="var(--accent-color)" />,
    title: 'Field Monitoring',
    desc: 'View your fields on an interactive map and understand their current condition.'
  },
  {
    icon: <ShieldCheck size={28} color="var(--status-healthy)" />,
    title: 'Risk Detection',
    desc: 'Find areas that may need attention before problems become visible in the field.'
  },
  {
    icon: <LineChart size={28} color="#a855f7" />,
    title: 'Analysis Results',
    desc: 'Get clear screening results with vegetation indicators, land-cover labels, and season history.'
  }
];

const BENEFITS = [
  {
    icon: <Leaf size={26} color="var(--status-healthy)" />,
    title: 'Detect issues earlier',
    desc: 'Identify weak or stressed areas before they spread across the field.'
  },
  {
    icon: <Satellite size={26} color="var(--accent-color)" />,
    title: 'Monitor remotely',
    desc: 'Check field conditions without visiting every parcel manually.'
  },
  {
    icon: <Database size={26} color="#8b5cf6" />,
    title: 'Keep field history',
    desc: 'Save analyses and compare field condition across different seasons.'
  }
];

const TECH_CARDS = [
  {
    icon: <Satellite size={26} color="var(--accent-color)" />,
    title: 'Satellite imagery',
    desc: 'Field conditions are reviewed using remote imagery instead of only manual inspection.'
  },
  {
    icon: <BrainCircuit size={26} color="#a855f7" />,
    title: 'AI-assisted analysis',
    desc: 'The system helps classify land cover and highlight where field inspection may be useful.'
  },
  {
    icon: <Sprout size={26} color="var(--status-healthy)" />,
    title: 'Vegetation insights',
    desc: 'The platform converts raw imagery into understandable vegetation indicators for field monitoring.'
  }
];

const FAQ_ITEMS = [
  {
    title: 'What can AgroVision help me understand?',
    text: 'It helps you review field condition, vegetation signals, detected land cover, and previous analysis results.'
  },
  {
    title: 'Do I need technical knowledge to use it?',
    text: 'No. The system is designed around simple steps: add a field, run analysis, and review the results.'
  },
  {
    title: 'Can I upload my own field boundaries?',
    text: 'Yes. You can upload field boundaries or draw a field directly on the map.'
  },
  {
    title: 'Does this replace agronomists?',
    text: 'No. AgroVision supports field monitoring by showing where attention may be needed. Agronomic decisions should still include field inspection and expert judgment.'
  }
];

const scrollToSection = (sectionId) => {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
};

export default function LandingPage({ onSignIn, onGetStarted, theme, onToggleTheme }) {
  return (
    <div className="landing-page">
      <div className="landing-shell">
        <nav className="landing-nav">
          <div className="landing-nav-brand">
            <AgroVisionLogo size={38} />
            <span className="landing-brand-name">AgroVision</span>
          </div>

          <div className="landing-nav-links">
            {NAV_LINKS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="landing-nav-link"
                onClick={() => scrollToSection(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="landing-nav-actions">
            <ThemeToggleButton theme={theme} onToggle={onToggleTheme} />
            <button type="button" className="landing-btn-ghost" onClick={onSignIn}>Sign In</button>
            <button type="button" className="landing-btn-outline" onClick={onGetStarted}>Get Started</button>
          </div>
        </nav>

        <section className="landing-hero">
          <div className="landing-hero-grid">
            <div className="landing-hero-copy glass-panel">
              <div className="landing-hero-badge">
                <MapPin size={14} />
                <span>Farmland monitoring · Vegetation indicators · Land-cover insights</span>
              </div>
              <h1 className="landing-headline">
                Monitor farmland conditions from one clear workspace.
              </h1>
              <p className="landing-subheadline">
                AgroVision helps you review field condition, vegetation signals, and land-cover screening results using satellite imagery and model-assisted analysis.
              </p>
              <div className="landing-cta-row">
                <button type="button" className="landing-btn-primary" onClick={onGetStarted}>
                  Get Started
                  <ChevronRight size={16} />
                </button>
                <button type="button" className="landing-btn-secondary" onClick={() => scrollToSection('how-it-works')}>
                  See How It Works
                </button>
              </div>
            </div>

            <aside className="landing-product-panel glass-panel">
              <div>
                <div className="page-kicker">Service Snapshot</div>
                <h3>Clear and practical tools</h3>
                <p className="landing-panel-copy">
                  Add your fields, run remote analysis, and get actionable insights without complex technical setups.
                </p>
              </div>

              <div className="landing-hero-metrics">
                <div className="landing-metric">
                  <span className="landing-metric-value">Satellite</span>
                  <span className="landing-metric-label">Remote imagery</span>
                </div>
                <div className="landing-metric">
                  <span className="landing-metric-value">NDVI / EVI</span>
                  <span className="landing-metric-label">Vegetation indicators</span>
                </div>
                <div className="landing-metric">
                  <span className="landing-metric-value">AI-assisted</span>
                  <span className="landing-metric-label">Land-cover screening</span>
                </div>
              </div>
            </aside>
          </div>
        </section>

        <section id="features" className="landing-section landing-section-anchor">
          <div className="landing-section-header">
            <p className="landing-section-label">Features</p>
            <h2 className="landing-section-title">Everything you need to understand your fields</h2>
            <p className="landing-section-copy">
              AgroVision turns field boundaries and satellite-based analysis into clear information about field condition, vegetation signals, and monitoring history.
            </p>
          </div>

          <div className="landing-mission-grid">
            {FEATURES.map(({ icon, title, desc }) => (
              <div key={title} className="landing-mission-card glass-panel">
                {icon}
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how-it-works" className="landing-section landing-section-anchor">
          <div className="landing-section-header">
            <p className="landing-section-label">How It Works</p>
            <h2 className="landing-section-title">Simple steps to field insights</h2>
            <p className="landing-section-copy">
              Add your field and get a clear monitoring summary in minutes.
            </p>
          </div>

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

        <section id="benefits" className="landing-section landing-section-anchor">
          <div className="landing-section-header">
            <p className="landing-section-label">Benefits</p>
            <h2 className="landing-section-title">Why use AgroVision?</h2>
            <p className="landing-section-copy">
              Keep field monitoring organized with clear satellite-based screening and season-by-season history.
            </p>
          </div>

          <div className="landing-mission-grid">
            {BENEFITS.map(({ icon, title, desc }) => (
              <div key={title} className="landing-mission-card glass-panel">
                {icon}
                <h3>{title}</h3>
                <p>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="technology" className="landing-section landing-section-anchor">
          <div className="landing-section-header">
            <p className="landing-section-label">Technology</p>
            <h2 className="landing-section-title">Powered by satellite imagery and AI-assisted analysis</h2>
            <p className="landing-section-copy">
              The technical layer stays behind the interface, while users see a simple screening summary first and technical indicators second.
            </p>
          </div>

          <div className="landing-features">
            {TECH_CARDS.map(({ icon, title, desc }) => (
              <div key={title} className="landing-feature-card glass-panel">
                <div className="landing-feature-icon">{icon}</div>
                <h3 className="landing-feature-title">{title}</h3>
                <p className="landing-feature-desc">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="landing-section landing-section-anchor">
          <div className="landing-section-header">
            <p className="landing-section-label">FAQ</p>
            <h2 className="landing-section-title">Frequently Asked Questions</h2>
          </div>

          <div className="landing-faq">
            {FAQ_ITEMS.map((item) => (
              <div key={item.title} className="landing-faq-item glass-panel">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="contact" className="landing-section landing-section-anchor">
          <div className="landing-section-header">
            <p className="landing-section-label">Get Started</p>
            <h2 className="landing-section-title">Ready to monitor your fields?</h2>
            <p className="landing-section-copy">
              Start adding your fields today and let AgroVision support field monitoring with satellite indicators and season history.
            </p>
          </div>

          <div className="landing-contact-grid">
            <div className="landing-contact-card glass-panel" style={{ gridColumn: '1 / -1', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <AgroVisionLogo size={46} />
              <h3>Start Monitoring</h3>
              <p style={{ maxWidth: '600px', margin: '0 auto 1.5rem' }}>Create an account to start adding field boundaries, running satellite analyses, and tracking your field history.</p>
              <div className="landing-cta-row" style={{ justifyContent: 'center' }}>
                <button type="button" className="landing-btn-primary" onClick={onGetStarted}>
                  Get Started Now
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </section>

        <footer className="landing-footer">
          <div>
            <p className="landing-footer-title">AgroVision</p>
            <p>Farmland monitoring, vegetation indicators, and land-cover screening in one workspace.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
