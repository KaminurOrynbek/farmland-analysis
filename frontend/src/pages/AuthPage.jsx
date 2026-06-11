import React, { useState } from 'react';
import { ArrowLeft, Lock, Mail, UserRound, ShieldCheck } from 'lucide-react';
import { loginUser, registerUser } from '../api/client';
import ThemeToggleButton from '../components/common/ThemeToggleButton.jsx';
import LanguageSwitcher from '../components/common/LanguageSwitcher.jsx';
import { APP_PAGES } from '../constants/appPages';
import { getUserRoleLabel, t } from '../i18n.js';

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
export default function AuthPage({
  onBack,
  onLogin,
  onRegistered,
  theme,
  onToggleTheme,
  locale,
  onChangeLocale
}) {
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

      const user = await loginUser(loginForm);


      onLogin(user);
    } catch (err) {
      setError(t(err.response?.data?.detail || 'Incorrect email or password.'));
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

      onRegistered?.(createdUser);
      setSuccess(t('Account created successfully. You can now sign in.'));
      setMode('login');
      setLoginForm({
        email: createdUser.email || registerForm.email,
        password: registerForm.password
      });
      setRegisterForm(DEFAULT_REGISTER);
    } catch (err) {
      setError(t(err.response?.data?.detail || 'Registration failed.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <div className="auth-shell-header">
          <button type="button" className="auth-back" onClick={onBack}>
            <ArrowLeft size={18} />
            {t('Back to Landing')}
          </button>

          <LanguageSwitcher value={locale} onChange={onChangeLocale} />
          <ThemeToggleButton theme={theme} onToggle={onToggleTheme} />
        </div>

        <section className="auth-layout">
          <div className="auth-card glass-panel">
            <div className="auth-badge">
              <ShieldCheck size={16} />
              {t('Secure Access')}
            </div>

            <h1 className="auth-title">{isLogin ? t('Welcome back') : t('Create your account')}</h1>
            <p className="auth-subtitle">
              {isLogin
                ? t('Sign in to access your fields, workspace, and analysis results.')
                : t('Create an account to save fields, run analysis, and manage your farmland monitoring history.')}
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
                {t('Sign In')}
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
                {t('Register')}
              </button>
            </div>

            {error && <div className="auth-alert error">{error}</div>}
            {success && <div className="auth-alert success">{success}</div>}

            {isLogin ? (
              <form className="auth-form" onSubmit={handleLoginSubmit}>
                <label className="auth-label">
                  {t('Email')}
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
                  {t('Password')}
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
                      placeholder={t('Enter password')}
                      required
                    />
                  </div>
                </label>

                <div className="auth-inline-actions">
                  <button type="submit" className="primary-auth-button" disabled={isSubmitting}>
                    {isSubmitting ? t('Signing in...') : t('Sign In to Dashboard')}
                  </button>
                </div>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleRegisterSubmit}>
                <label className="auth-label">
                  {t('Full name')}
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
                      placeholder={t('Your full name')}
                      required
                    />
                  </div>
                </label>

                <label className="auth-label">
                  {t('Email')}
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
                  {t('Password')}
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
                      placeholder={t('Create password')}
                      required
                    />
                  </div>
                </label>

                <label className="auth-label">
                  {t('Role')}
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
                    <option value="FARMER">{getUserRoleLabel('FARMER')}</option>
                    <option value="AGRONOMIST">{getUserRoleLabel('AGRONOMIST')}</option>
                  </select>
                </label>

                <div className="auth-inline-actions">
                  <button type="submit" className="primary-auth-button" disabled={isSubmitting}>
                    {isSubmitting ? t('Creating account...') : t('Create Account')}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="auth-info glass-panel">
            <h2 className="auth-info-title">{t('What you unlock')}</h2>

            <div className="auth-info-list">
              <div className="auth-info-item">
                <span className="auth-info-kicker">{t(APP_PAGES.FIELDS)}</span>
                <p>{t('Track saved fields, recent analyses, and key vegetation metrics at a glance.')}</p>
              </div>

              <div className="auth-info-item">
                <span className="auth-info-kicker">{t(APP_PAGES.WORKSPACE)}</span>
                <p>{t('Upload boundaries, draw parcels, prepare imagery, and run field analysis.')}</p>
              </div>

              <div className="auth-info-item">
                <span className="auth-info-kicker">{t(APP_PAGES.ANALYSIS_RESULTS)}</span>
                <p>{t('Review field condition, land-cover classification, vegetation indicators, and screening priority.')}</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
