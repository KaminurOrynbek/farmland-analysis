import React from 'react';
import {
  ChevronRight,
  LogOut,
  Map,
  ShieldCheck,
  UserRound
} from 'lucide-react';

const initialsFromName = (name = 'AgroVision User') => (
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join('') || 'AG'
);

export default function ProfilePage({
  user,
  onNavigate,
  onLogout,
  onOpenAdmin,
  backendHealthy
}) {
  const profile = user || {
    name: 'AgroVision User',
    email: 'analyst@agrovision.ai',
    role: 'Research Analyst'
  };

  return (
    <div className="content-page">
      <section className="profile-hero glass-panel">
        <div className="profile-avatar">{initialsFromName(profile.name)}</div>

        <div className="profile-hero-copy">
          <div className="page-kicker">User Profile</div>
          <h1 className="page-title">{profile.name}</h1>
          <p className="page-subtitle">
            Manage your AgroVision workspace access, review your role, and move quickly back into your analysis flow.
          </p>

          <div className="profile-meta-row">
            <span className="status-pill neutral">{profile.email}</span>
            <span className="status-pill neutral">{profile.role}</span>
            <span className={`status-pill ${backendHealthy ? 'healthy' : 'critical'}`}>
              {backendHealthy ? 'Backend Connected' : 'Backend Unavailable'}
            </span>
          </div>
        </div>

        <div className="page-hero-actions">
          <button type="button" className="primary-btn" onClick={() => onNavigate('Workspace')}>
            Return to Workspace
          </button>
          <button type="button" className="secondary-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </section>

      <section className="split-panel-grid">
        <div className="section-card glass-panel">
          <div className="section-card-header">
            <div>
              <div className="section-kicker">Account</div>
              <h2>Profile details</h2>
            </div>
          </div>

          <div className="stack-list">
            <div className="stack-row">
              <span>Name</span>
              <strong>{profile.name}</strong>
            </div>
            <div className="stack-row">
              <span>Email</span>
              <strong>{profile.email}</strong>
            </div>
            <div className="stack-row">
              <span>Role</span>
              <strong>{profile.role}</strong>
            </div>
            <div className="stack-row">
              <span>Access model</span>
              <strong>Mock authentication for diploma demo</strong>
            </div>
          </div>
        </div>

        <div className="section-card glass-panel">
          <div className="section-card-header">
            <div>
              <div className="section-kicker">Workspace</div>
              <h2>Recommended next actions</h2>
            </div>
          </div>

          <div className="stack-list">
            <button type="button" className="list-action-row" onClick={() => onNavigate('Home')}>
              <div>
                <strong>Go to Home Dashboard</strong>
                <p>Review summary cards, recent projects, and latest analysis status.</p>
              </div>
              <ChevronRight size={18} color="var(--text-secondary)" />
            </button>
            <button type="button" className="list-action-row" onClick={() => onNavigate('Projects')}>
              <div>
                <strong>Open Projects & History</strong>
                <p>Inspect saved fields, historical analyses, and field-level risk trends.</p>
              </div>
              <ChevronRight size={18} color="var(--text-secondary)" />
            </button>
            <button type="button" className="list-action-row" onClick={onLogout}>
              <div>
                <strong>Sign out of AgroVision</strong>
                <p>Return to the public product experience and mock auth entry point.</p>
              </div>
              <LogOut size={18} color="var(--text-secondary)" />
            </button>
          </div>
        </div>
      </section>

      <section className="split-panel-grid">
        <div className="section-card glass-panel">
          <div className="section-card-header">
            <div>
              <div className="section-kicker">Product Role</div>
              <h2>How this account is positioned</h2>
            </div>
          </div>

          <div className="insight-grid">
            <div className="insight-card">
              <UserRound size={18} color="var(--accent-color)" />
              <div>
                <strong>Research-oriented workflow</strong>
                <p>This account is designed for demoing field monitoring, vegetation indices, and model-driven agronomic support.</p>
              </div>
            </div>
            <div className="insight-card">
              <Map size={18} color="var(--status-healthy)" />
              <div>
                <strong>Workspace-first execution</strong>
                <p>Map tools remain the operational layer, while Home and Projects create a clearer product journey around them.</p>
              </div>
            </div>
            <div className="insight-card">
              <ShieldCheck size={18} color="#8b5cf6" />
              <div>
                <strong>Expandable governance model</strong>
                <p>The frontend is now structured so an admin-only control surface can exist without complicating the main user navigation.</p>
              </div>
            </div>
          </div>
        </div>

        {onOpenAdmin ? (
          <div className="section-card glass-panel">
            <div className="section-card-header">
              <div>
                <div className="section-kicker">Admin Access</div>
                <h2>Optional administration workspace</h2>
              </div>
            </div>

            <p className="card-copy">
              Because this mock account has administrator access, you can open the optional admin dashboard without exposing it in the main private navbar.
            </p>

            <div className="page-hero-actions">
              <button type="button" className="primary-btn" onClick={onOpenAdmin}>
                Open Admin Dashboard
              </button>
            </div>
          </div>
        ) : (
          <div className="section-card glass-panel">
            <div className="section-card-header">
              <div>
                <div className="section-kicker">Permissions</div>
                <h2>Standard research access</h2>
              </div>
            </div>

            <p className="card-copy">
              This account follows the normal analyst flow: Home, Workspace, Analysis Details, Projects, and Profile. Admin tools stay out of the primary navigation to keep the product journey focused.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
