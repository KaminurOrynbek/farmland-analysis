import React, { useState } from 'react';
import { ArrowLeft, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';

const buildUserFromEmail = (email) => {
  const normalizedEmail = email.trim().toLowerCase() || 'analyst@agrovision.ai';
  const localPart = normalizedEmail.split('@')[0] || 'agrovision user';
  const displayName = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');

  return {
    name: displayName || 'AgroVision User',
    email: normalizedEmail,
    role: normalizedEmail.includes('admin') ? 'Administrator' : 'Research Analyst'
  };
};

export default function AuthPage({ onBack, onLogin }) {
  const [email, setEmail] = useState('analyst@agrovision.ai');
  const [password, setPassword] = useState('demo-access');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    window.setTimeout(() => {
      onLogin(buildUserFromEmail(email));
    }, 700);
  };

  const handleDemoAccess = (roleEmail) => {
    setEmail(roleEmail);
    setPassword('demo-access');
    setIsSubmitting(true);

    window.setTimeout(() => {
      onLogin(buildUserFromEmail(roleEmail));
    }, 400);
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">
        <button
          type="button"
          className="auth-back-btn"
          onClick={onBack}
        >
          <ArrowLeft size={16} />
          Back to Landing
        </button>

        <div className="auth-layout">
          <section className="auth-panel glass-panel">
            <div className="auth-badge">
              <ShieldCheck size={14} />
              Secure Demo Access
            </div>

            <h1 className="auth-title">Enter AgroVision</h1>
            <p className="auth-subtitle">
              Sign in to access your farmland monitoring dashboard, workspace map, and analysis reports.
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <label className="auth-label" htmlFor="email">
                Email
              </label>
              <div className="auth-input-wrap">
                <Mail size={16} />
                <input
                  id="email"
                  className="auth-input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="analyst@agrovision.ai"
                  required
                />
              </div>

              <label className="auth-label" htmlFor="password">
                Password
              </label>
              <div className="auth-input-wrap">
                <LockKeyhole size={16} />
                <input
                  id="password"
                  className="auth-input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button
                type="submit"
                className="primary-btn auth-submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Signing In...' : 'Sign In to Dashboard'}
              </button>
            </form>

            <div className="auth-inline-actions">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => handleDemoAccess('analyst@agrovision.ai')}
                disabled={isSubmitting}
              >
                Demo Analyst Access
              </button>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => handleDemoAccess('admin@agrovision.ai')}
                disabled={isSubmitting}
              >
                Demo Admin Access
              </button>
            </div>
          </section>

          <aside className="auth-info glass-panel">
            <h2 className="auth-info-title">What you unlock</h2>
            <div className="auth-info-list">
              <div className="auth-info-item">
                <span className="auth-info-kicker">Home Dashboard</span>
                <p>Track saved fields, recent analyses, and key vegetation metrics at a glance.</p>
              </div>
              <div className="auth-info-item">
                <span className="auth-info-kicker">Workspace Map</span>
                <p>Upload GeoJSON boundaries, draw parcels, fetch Sentinel-2 imagery, and run analysis.</p>
              </div>
              <div className="auth-info-item">
                <span className="auth-info-kicker">AI Reports</span>
                <p>Review NDVI, EVI, crop classification, stress zones, and risk interpretation from the latest run.</p>
              </div>
            </div>

            <div className="auth-note">
              Use any email for mock login. If the email contains <strong>admin</strong>, the optional admin workspace becomes available from Profile.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
