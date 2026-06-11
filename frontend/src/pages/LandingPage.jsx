import React from 'react';
import AgroVisionLogo from '../components/common/AgroVisionLogo';
import ThemeToggleButton from '../components/common/ThemeToggleButton.jsx';
import LanguageSwitcher from '../components/common/LanguageSwitcher.jsx';
import {
  Activity,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  CalendarClock,
  ChevronRight,
  Edit3,
  FileText,
  MapPin,
  Satellite,
  Sprout,
  Upload
} from 'lucide-react';
import { t } from '../i18n.js';

const NAV_LINKS = [
  { id: 'workflow', label: 'Workflow' },
  { id: 'results', label: 'Results' },
  { id: 'technology', label: 'Technology' },
  { id: 'faq', label: 'FAQ' }
];

const WORKFLOW_STEPS = [
  ['Choose season', 'Select the analysis season or date range.', <CalendarClock size={22} />],
  ['Add boundary', 'Upload a GeoJSON file or draw the field on the map.', <Upload size={22} />],
  ['Name field', 'Save the selected field with a clear name.', <Edit3 size={22} />],
  ['Fetch data', 'Request satellite data for the selected field.', <Satellite size={22} />],
  ['Run analysis', 'Generate vegetation, land-cover, and status results.', <Activity size={22} />]
];

const RESULT_ITEMS = [
  [
    'Is the field healthy?',
    'Vegetation indicators are summarized into a clear condition level, so users can quickly understand whether the field looks healthy, moderate, or stressed.',
    <Sprout size={24} />
  ],
  [
    'What is growing there?',
    'The report shows the detected land-cover category and confidence level for the selected field area.',
    <BrainCircuit size={24} />
  ],
  [
    'Does it need attention?',
    'Potential issues are translated into practical next steps, such as routine monitoring or field inspection.',
    <Activity size={24} />
  ],
  [
    'How has it changed?',
    'Previous analysis runs stay available, helping users compare field conditions across seasons.',
    <BarChart3 size={24} />
  ]
];

const FAQ_ITEMS = [
  ['What does AgroVision analyze?', 'Saved field boundaries using satellite imagery, vegetation indicators, and land-cover classification.'],
  ['Do users need technical knowledge?', 'No. The report starts with field status and recommended action. Technical values are shown later.'],
  ['Can users upload their own fields?', 'Yes. Users can upload GeoJSON files or draw field boundaries inside the Workspace.'],
  ['Does this replace field inspection?', 'No. It supports monitoring, but field inspection and expert judgment are still needed.']
];

const scrollToSection = (sectionId) => {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
};

function SatelliteHeroPanel() {
  return (
    <aside className="landing-map-panel glass-panel">
      <div className="landing-map-topbar">
        <span>{t('Satellite workspace')}</span>
        <span>{t('Boundary ready')}</span>
      </div>

      <div className="landing-map-stage">
        <div className="landing-map-toolbar">
          <span />
          <span />
          <span />
        </div>

        <div className="landing-map-boundary" />
        <div className="landing-map-pin">
          <MapPin size={14} />
          {t('Selected field')}
        </div>

        <div className="landing-map-caption">
          <strong>{t('From map to report')}</strong>
          <p>{t('Draw or upload a boundary, then run the analysis workflow.')}</p>
        </div>
      </div>

      <div className="landing-map-flow">
        <span>{t('Boundary')}</span>
        <ArrowRight size={14} />
        <span>{t('Imagery')}</span>
        <ArrowRight size={14} />
        <span>{t('Report')}</span>
      </div>
    </aside>
  );
}

export default function LandingPage({
  onSignIn,
  onGetStarted,
  theme,
  onToggleTheme,
  locale,
  onChangeLocale
}) {
  const handleScrollToTop = () => {
    const landingPage = document.querySelector('.landing-page');

    if (landingPage) {
      landingPage.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }

    document.documentElement.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    document.body.scrollTo({
      top: 0,
      behavior: 'smooth'
    });

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };
  
  return (
     <div className="landing-page">
      <style>{landingProfessionalCss}</style>

      <div className="landing-shell">
        <nav className="landing-nav">
          <button
            type="button"
            className="landing-nav-brand"
            onClick={handleScrollToTop}
          >
            <AgroVisionLogo size={38} />
            <span className="landing-brand-name">AgroVision</span>
          </button>

          <div className="landing-nav-links">
            {NAV_LINKS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="landing-nav-link"
                onClick={() => scrollToSection(item.id)}
              >
                {t(item.label)}
              </button>
            ))}
          </div>

          <div className="landing-nav-actions">
            <LanguageSwitcher value={locale} onChange={onChangeLocale} />
            <ThemeToggleButton theme={theme} onToggle={onToggleTheme} />
            <button type="button" className="landing-btn-ghost" onClick={onSignIn}>
              {t('Sign In')}
            </button>
            <button type="button" className="landing-btn-outline" onClick={onGetStarted}>
              {t('Get Started')}
            </button>
          </div>
        </nav>

        <section className="landing-hero landing-refined-hero">
          <div className="landing-hero-grid">
            <div className="landing-hero-copy glass-panel landing-hero-copy-refined">
              <div className="landing-hero-badge">
                <MapPin size={14} />
                <span>{t('Field boundaries · Satellite imagery · Monitoring reports')}</span>
              </div>

              <h1 className="landing-headline">
                {t('Turn field boundaries into satellite-based monitoring reports.')}
              </h1>

              <p className="landing-subheadline">
                {t('AgroVision helps users add a field, prepare satellite imagery, run analysis, and review vegetation condition, land-cover output, and season history.')}
              </p>

              <div className="landing-hero-points">
                <span>{t('GeoJSON upload or map drawing')}</span>
                <span>{t('NDVI / EVI vegetation indicators')}</span>
                <span>{t('Land-cover classification')}</span>
              </div>

              <div className="landing-cta-row">
                <button type="button" className="landing-btn-primary" onClick={onGetStarted}>
                  {t('Get Started')}
                  <ChevronRight size={16} />
                </button>

                <button
                  type="button"
                  className="landing-btn-secondary"
                  onClick={() => scrollToSection('workflow')}
                >
                  {t('View Workflow')}
                </button>
              </div>
            </div>

            <SatelliteHeroPanel />
          </div>
        </section>

        <section id="workflow" className="landing-section landing-section-anchor landing-workflow-section">
          <div className="landing-workflow-heading">
            <p className="landing-section-label">{t('Workflow')}</p>
            <h2 className="landing-section-title">{t('Five steps inside the Workspace')}</h2>
            <p className="landing-section-copy">
              {t('The process follows the actual field analysis flow used in the application.')}
            </p>
          </div>

          <div className="landing-workflow-strip glass-panel">
            {WORKFLOW_STEPS.map(([title, desc, icon], index) => (
              <div key={title} className="landing-workflow-item">
                <div className="landing-workflow-top">
                  <div className="landing-workflow-number">{index + 1}</div>
                  <div className="landing-workflow-icon">{icon}</div>
                </div>
                <h3>{t(title)}</h3>
                <p>{t(desc)}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="results" className="landing-section landing-section-anchor">
          <div className="landing-results-layout">
            <div className="landing-results-copy">
              <p className="landing-section-label">{t('Results')}</p>
              <h2 className="landing-section-title">{t('What the report helps you understand')}</h2>
              <p className="landing-section-copy">
                {t('AgroVision turns satellite analysis into clear field insights. Each report helps users understand field condition, detected land cover, recommended action, and seasonal history without reading technical values first.')}
              </p>
            </div>

            <div className="landing-results-grid">
              {RESULT_ITEMS.map(([title, desc, icon]) => (
                <div key={title} className="landing-result-card glass-panel">
                  <div className="landing-result-icon">{icon}</div>
                  <div>
                    <h3>{t(title)}</h3>
                    <p>{t(desc)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="technology" className="landing-section landing-section-anchor">
          <div className="landing-section-header">
            <p className="landing-section-label">{t('Technology')}</p>
            <h2 className="landing-section-title">{t('How analysis is formed')}</h2>
            <p className="landing-section-copy">
              {t('The technical workflow stays behind the interface, while the user receives a readable report.')}
            </p>
          </div>

          <div className="landing-tech-row glass-panel">
            <div>
              <Satellite size={24} />
              <strong>{t('Satellite image')}</strong>
              <span>{t('Imagery is selected for the field and season.')}</span>
            </div>
            <ArrowRight size={18} />
            <div>
              <Sprout size={24} />
              <strong>NDVI / EVI</strong>
              <span>{t('Vegetation indicators are calculated.')}</span>
            </div>
            <ArrowRight size={18} />
            <div>
              <BrainCircuit size={24} />
              <strong>{t('Model output')}</strong>
              <span>{t('Land-cover class and confidence are returned.')}</span>
            </div>
            <ArrowRight size={18} />
            <div>
              <BarChart3 size={24} />
              <strong>{t('Field report')}</strong>
              <span>{t('Status, recommendation, map, and history are shown.')}</span>
            </div>
          </div>
        </section>

        <section id="faq" className="landing-section landing-section-anchor">
          <div className="landing-section-header">
            <p className="landing-section-label">{t('FAQ')}</p>
            <h2 className="landing-section-title">{t('Frequently asked questions')}</h2>
          </div>

          <div className="landing-faq">
            {FAQ_ITEMS.map(([title, text]) => (
              <div key={title} className="landing-faq-item glass-panel">
                <h3>{t(title)}</h3>
                <p>{t(text)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="landing-section landing-section-anchor">
          <div className="landing-final-card glass-panel">
            <AgroVisionLogo size={48} />
            <div>
              <p className="landing-section-label">{t('Get Started')}</p>
              <h2 className="landing-section-title">{t('Start with one field')}</h2>
              <p className="landing-section-copy">
                {t('Create an account, add a boundary, and generate the first land health report.')}
              </p>
            </div>
            <button type="button" className="landing-btn-primary" onClick={onGetStarted}>
              {t('Get Started Now')}
              <ChevronRight size={16} />
            </button>
          </div>
        </section>

        <footer className="landing-footer">
          <div>
            <p className="landing-footer-title">AgroVision</p>
            <p>{t('Satellite-based farmland monitoring with vegetation indicators and field history.')}</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

const landingProfessionalCss = `
  .landing-refined-hero {
    padding-top: 42px;
  }

  .landing-hero-copy-refined {
    position: relative;
    overflow: hidden;
  }
  .landing-nav-brand {
    display: flex;
    align-items: center;
    gap: 12px;
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    transition: opacity 0.2s ease;
  }

  .landing-nav-brand:hover {
    opacity: 0.85;
  }

  .landing-hero-copy-refined::after {
    content: '';
    position: absolute;
    right: -120px;
    bottom: -120px;
    width: 320px;
    height: 320px;
    border-radius: 999px;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.14), transparent 68%);
    pointer-events: none;
  }

  .landing-hero-points {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    margin: 24px 0 0;
  }

  .landing-hero-points span {
    padding: 8px 11px;
    border-radius: 999px;
    border: 1px solid var(--border-color);
    background: var(--surface-highlight-2);
    color: var(--text-secondary);
    font-size: 0.84rem;
    font-weight: 700;
  }

  .landing-map-panel {
    padding: 22px;
    border-radius: 30px;
    display: grid;
    gap: 14px;
  }

  .landing-map-topbar {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    color: var(--text-secondary);
    font-size: 0.82rem;
    font-weight: 800;
  }

  .landing-map-stage {
    position: relative;
    min-height: 390px;
    border-radius: 24px;
    overflow: hidden;
    border: 1px solid var(--border-color);
    background-image:
      linear-gradient(rgba(15, 23, 42, 0.02), rgba(15, 23, 42, 0.14)),
      url('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/2/1/2');
    background-size: cover;
    background-position: center;
  }

  .landing-map-stage::after {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 70% 20%, rgba(255,255,255,0.24), transparent 30%);
    pointer-events: none;
  }

  .landing-map-toolbar {
    position: absolute;
    top: 14px;
    left: 14px;
    z-index: 2;
    display: grid;
    gap: 6px;
  }

  .landing-map-toolbar span {
    width: 34px;
    height: 34px;
    border-radius: 9px;
    background: rgba(255, 255, 255, 0.88);
    border: 1px solid rgba(15, 23, 42, 0.15);
    box-shadow: 0 8px 22px rgba(15, 23, 42, 0.14);
  }

  .landing-map-boundary {
    position: absolute;
    left: 28%;
    top: 34%;
    width: 38%;
    height: 28%;
    z-index: 2;
    border: 3px solid rgba(255, 255, 255, 0.95);
    background: rgba(34, 197, 94, 0.22);
    box-shadow: 0 16px 38px rgba(15, 23, 42, 0.16);
  }

  .landing-map-pin {
    position: absolute;
    top: 28%;
    right: 14%;
    z-index: 3;
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 10px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.9);
    color: #0f172a;
    font-weight: 800;
    font-size: 0.82rem;
    box-shadow: 0 16px 34px rgba(15, 23, 42, 0.18);
  }

  .landing-map-caption {
    position: absolute;
    left: 18px;
    right: 18px;
    bottom: 18px;
    z-index: 3;
    padding: 16px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.86);
    color: #0f172a;
    box-shadow: 0 16px 34px rgba(15, 23, 42, 0.14);
  }

  .landing-map-caption p {
    margin: 6px 0 0;
    color: #475569;
  }

  .landing-map-flow {
    display: grid;
    grid-template-columns: 1fr auto 1fr auto 1fr;
    align-items: center;
    gap: 8px;
    padding: 12px;
    border-radius: 18px;
    background: var(--surface-highlight-2);
    border: 1px solid var(--border-color);
  }

  .landing-map-flow span {
    text-align: center;
    color: var(--text-primary);
    font-weight: 800;
    font-size: 0.84rem;
  }

  .landing-map-flow svg {
    color: var(--accent-color);
  }

    .landing-shell {
    max-width: 100%;
    width: 100%;
  }

  .landing-refined-hero {
    padding-top: 42px;
    min-height: auto;
  }

  .landing-hero {
    min-height: auto;
  }

  .landing-hero-grid {
    width: min(100%, 1380px);
    margin: 0 auto;
    align-items: stretch;
  }

  .landing-section {
    width: min(100%, 1380px);
    margin-left: auto;
    margin-right: auto;
  }

  @media (max-width: 1180px) {
    .landing-refined-hero {
      padding-top: 32px;
    }

    .landing-hero-grid {
      width: min(100% - 32px, 1120px);
      grid-template-columns: 1fr;
    }

    .landing-section {
      width: min(100% - 32px, 1120px);
    }
  }

  @media (min-width: 1181px) {
    .landing-hero-grid {
      grid-template-columns: minmax(0, 1.35fr) minmax(420px, 0.85fr);
    }
  }

    .landing-workflow-heading {
    max-width: 760px;
    margin-bottom: 26px;
  }

  .landing-workflow-strip {
    padding: 18px;
    border-radius: 30px;
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 14px;
  }

  .landing-workflow-item {
    min-height: 190px;
    padding: 20px;
    border-radius: 22px;
    border: 1px solid var(--border-color);
    background: var(--surface-highlight-2);
  }

  .landing-workflow-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 22px;
  }

  .landing-workflow-number {
    width: 34px;
    height: 34px;
    border-radius: 12px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(34, 197, 94, 0.14);
    color: var(--status-healthy);
    border: 1px solid rgba(34, 197, 94, 0.26);
    font-weight: 900;
  }

  .landing-workflow-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(59, 130, 246, 0.1);
    color: var(--accent-color);
  }

  .landing-workflow-item h3 {
    margin: 0 0 8px;
    color: var(--text-primary);
  }

  .landing-workflow-item p {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.55;
  }

  @media (max-width: 1180px) {
    .landing-workflow-strip {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 720px) {
    .landing-workflow-strip {
      grid-template-columns: 1fr;
    }
  }

  .landing-results-layout {
    display: grid;
    grid-template-columns: minmax(260px, 420px) 1fr;
    gap: 26px;
    align-items: start;
  }

  .landing-results-copy {
    position: sticky;
    top: 120px;
  }

  .landing-results-grid {
    display: grid;
    gap: 14px;
  }

  .landing-result-card {
    min-height: 132px;
    padding: 22px;
    border-radius: 24px;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 16px;
    align-items: start;
  }

  .landing-result-icon {
    width: 46px;
    height: 46px;
    border-radius: 15px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(59, 130, 246, 0.1);
    color: var(--accent-color);
  }

  .landing-result-card h3 {
    margin: 0 0 8px;
    color: var(--text-primary);
  }

  .landing-result-card p {
    margin: 0;
    color: var(--text-secondary);
    line-height: 1.6;
  }

  .landing-tech-row {
    padding: 24px;
    border-radius: 28px;
    display: grid;
    grid-template-columns: 1fr auto 1fr auto 1fr auto 1fr;
    gap: 16px;
    align-items: center;
  }

  .landing-tech-row > div {
    min-height: 138px;
    padding: 20px;
    border-radius: 20px;
    border: 1px solid var(--border-color);
    background: var(--surface-highlight-2);
    display: grid;
    gap: 10px;
    align-content: start;
  }

  .landing-tech-row svg {
    color: var(--accent-color);
  }

  .landing-tech-row strong {
    color: var(--text-primary);
  }

  .landing-tech-row span {
    color: var(--text-secondary);
    line-height: 1.55;
  }

  .landing-final-card {
    padding: 42px;
    border-radius: 30px;
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: 24px;
    align-items: center;
  }

  @media (max-width: 1180px) {
    .landing-section-header-row,
    .landing-results-layout {
      grid-template-columns: 1fr;
    }

    .landing-results-copy {
      position: static;
    }

    .landing-final-card {
      grid-template-columns: 1fr;
      text-align: center;
      justify-items: center;
    }
  }

  @media (max-width: 720px) {
    .landing-map-stage {
      min-height: 280px;
    }

    .landing-result-card {
      grid-template-columns: 1fr;
    }

    .landing-map-flow {
      grid-template-columns: 1fr;
    }

    .landing-map-flow svg {
      display: none;
    }
  }
`;
