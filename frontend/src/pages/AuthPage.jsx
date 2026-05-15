import React, { useState } from 'react';
import { ArrowLeft, Lock, Mail, UserRound, ShieldCheck } from 'lucide-react';
import { loginUser, registerUser } from '../api';

const DEFAULT_LOGIN = {
  email: '',
  password: ''
};

const DEFAULT_REGISTER = {
  email: '',
  password: '',
  fullName: '',
  role: 'FARMER'
};



export default function AuthPage({ onBack, onLogin }) {
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState(DEFAULT_LOGIN);
  const [registerForm, setRegisterForm] = useState(DEFAULT_REGISTER);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isLogin = mode === 'login';

  const handleLoginSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      await loginUser(loginForm);

      const inferredRole =
        loginForm.email.includes('admin')
          ? 'ADMIN'
          : 'FARMER';

      const user = {
        name: loginForm.email.split('@')[0],
        email: loginForm.email,
        role: inferredRole
      };

      onLogin(user);
    } catch (err) {
      setError(err.response?.data?.detail || 'Incorrect email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      const createdUser = await registerUser(registerForm);

      setSuccess('Account created successfully. You can now sign in.');
      setMode('login');
      setLoginForm({
        email: createdUser.email || registerForm.email,
        password: registerForm.password
      });
      setRegisterForm(DEFAULT_REGISTER);
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <button type="button" className="auth-back" onClick={onBack}>
          <ArrowLeft size={18} />
          Back to Landing
        </button>

        <section className="auth-layout">
          <div className="auth-card glass-panel">
            <div className="auth-badge">
              <ShieldCheck size={16} />
              Secure Access
            </div>

            <h1 className="auth-title">{isLogin ? 'Welcome back' : 'Create your account'}</h1>
            <p className="auth-subtitle">
              {isLogin
                ? 'Sign in to access your farmland monitoring dashboard, workspace map, and analysis reports.'
                : 'Create an account to save fields, run analysis, and manage your farmland monitoring history.'}
            </p>

            <div className="auth-tabs">
              <button
                type="button"
                className={isLogin ? 'active' : ''}
                onClick={() => {
                  setMode('login');
                  setError('');
                  setSuccess('');
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                className={!isLogin ? 'active' : ''}
                onClick={() => {
                  setMode('register');
                  setError('');
                  setSuccess('');
                }}
              >
                Register
              </button>
            </div>

            {error && <div className="auth-alert error">{error}</div>}
            {success && <div className="auth-alert success">{success}</div>}

            {isLogin ? (
              <form className="auth-form" onSubmit={handleLoginSubmit}>
                <label className="auth-label">
                  Email
                  <div className="auth-input">
                    <Mail size={18} />
                    <input
                      type="email"
                      value={loginForm.email}
                      onChange={(e) =>
                        setLoginForm((current) => ({
                          ...current,
                          email: e.target.value
                        }))
                      }
                      placeholder="farmer@example.com"
                      required
                    />
                  </div>
                </label>

                <label className="auth-label">
                  Password
                  <div className="auth-input">
                    <Lock size={18} />
                    <input
                      type="password"
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm((current) => ({
                          ...current,
                          password: e.target.value
                        }))
                      }
                      placeholder="Enter password"
                      required
                    />
                  </div>
                </label>

                <div className="auth-inline-actions">
                  <button type="submit" className="primary-auth-button" disabled={isSubmitting}>
                    {isSubmitting ? 'Signing in...' : 'Sign In to Dashboard'}
                  </button>
                </div>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleRegisterSubmit}>
                <label className="auth-label">
                  Full name
                  <div className="auth-input">
                    <UserRound size={18} />
                    <input
                      type="text"
                      value={registerForm.fullName}
                      onChange={(e) =>
                        setRegisterForm((current) => ({
                          ...current,
                          fullName: e.target.value
                        }))
                      }
                      placeholder="Your full name"
                      required
                    />
                  </div>
                </label>

                <label className="auth-label">
                  Email
                  <div className="auth-input">
                    <Mail size={18} />
                    <input
                      type="email"
                      value={registerForm.email}
                      onChange={(e) =>
                        setRegisterForm((current) => ({
                          ...current,
                          email: e.target.value
                        }))
                      }
                      placeholder="farmer@example.com"
                      required
                    />
                  </div>
                </label>

                <label className="auth-label">
                  Password
                  <div className="auth-input">
                    <Lock size={18} />
                    <input
                      type="password"
                      value={registerForm.password}
                      onChange={(e) =>
                        setRegisterForm((current) => ({
                          ...current,
                          password: e.target.value
                        }))
                      }
                      placeholder="Create password"
                      required
                    />
                  </div>
                </label>

                <label className="auth-label">
                  Role
                  <select
                    className="auth-select"
                    value={registerForm.role}
                    onChange={(e) =>
                      setRegisterForm((current) => ({
                        ...current,
                        role: e.target.value
                      }))
                    }
                  >
                    <option value="FARMER">Farmer</option>
                    <option value="AGRONOMIST">Agronomist</option>
                  </select>
                </label>

                <div className="auth-inline-actions">
                  <button type="submit" className="primary-auth-button" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating account...' : 'Create Account'}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="auth-info glass-panel">
            <h2 className="auth-info-title">What you unlock</h2>

            <div className="auth-info-list">
              <div className="auth-info-item">
                <span className="auth-info-kicker">Home Dashboard</span>
                <p>Track saved fields, recent analyses, and key vegetation metrics at a glance.</p>
              </div>

              <div className="auth-info-item">
                <span className="auth-info-kicker">Workspace Map</span>
                <p>Upload boundaries, draw parcels, prepare imagery, and run field analysis.</p>
              </div>

              <div className="auth-info-item">
                <span className="auth-info-kicker">AI Reports</span>
                <p>Review field health, crop classification, stress zones, and risk interpretation.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}