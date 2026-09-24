import React, { useState } from 'react';
import { X, Sparkles, AlertCircle, CheckCircle2, Mail, Lock, User, Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Screens: 'login' | 'signup' | 'verify_email' | 'forgot_password' | 'reset_sent'
export default function AuthModal({ isOpen, onClose }) {
  const { signInWithGoogle, signInWithFacebook, signInWithEmail, signUpWithEmail, resetPassword, isConfigured } = useAuth();

  const [screen, setScreen] = useState('login');
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState('');

  // Form fields
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });

  if (!isOpen) return null;

  const resetState = (newScreen) => {
    setErrorMsg('');
    setSuccessMsg('');
    setForm({ name: '', email: '', password: '', confirmPassword: '' });
    setShowPass(false);
    setScreen(newScreen);
  };

  const handleField = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (errorMsg) setErrorMsg('');
  };

  // ─── Google ──────────────────────────────────────────────────
  const handleGoogle = async () => {
    try {
      setLoadingProvider('google'); setErrorMsg('');
      await signInWithGoogle();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Google sign-in failed. Please try again.');
    } finally { setLoadingProvider(null); }
  };

  // ─── Facebook ────────────────────────────────────────────────
  const handleFacebook = async () => {
    try {
      setLoadingProvider('facebook'); setErrorMsg('');
      await signInWithFacebook();
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'Facebook sign-in failed. Please try again.');
    } finally { setLoadingProvider(null); }
  };

  // ─── Email Sign-In ───────────────────────────────────────────
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!form.email.trim() || !form.password) return setErrorMsg('Please enter your email and password.');
    try {
      setLoadingProvider('email'); setErrorMsg('');
      await signInWithEmail(form.email.trim(), form.password);
      onClose();
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('Email not confirmed')) {
        setVerifyEmail(form.email.trim());
        setScreen('verify_email');
      } else if (msg.includes('Invalid login credentials')) {
        setErrorMsg('Incorrect email or password. Please try again.');
      } else {
        setErrorMsg(msg || 'Sign-in failed. Please try again.');
      }
    } finally { setLoadingProvider(null); }
  };

  // ─── Email Sign-Up ───────────────────────────────────────────
  const handleEmailSignup = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return setErrorMsg('Please enter your full name.');
    if (!form.email.trim()) return setErrorMsg('Please enter a valid email address.');
    if (form.password.length < 8) return setErrorMsg('Password must be at least 8 characters.');
    if (form.password !== form.confirmPassword) return setErrorMsg('Passwords do not match.');
    try {
      setLoadingProvider('email'); setErrorMsg('');
      await signUpWithEmail(form.email.trim(), form.password, form.name.trim());
      setVerifyEmail(form.email.trim());
      setScreen('verify_email');
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already registered')) {
        setErrorMsg('An account with this email already exists. Please sign in.');
      } else {
        setErrorMsg(msg || 'Sign-up failed. Please try again.');
      }
    } finally { setLoadingProvider(null); }
  };

  // ─── Forgot Password ─────────────────────────────────────────
  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!form.email.trim()) return setErrorMsg('Please enter your email address.');
    try {
      setLoadingProvider('reset'); setErrorMsg('');
      await resetPassword(form.email.trim());
      setVerifyEmail(form.email.trim());
      setScreen('reset_sent');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to send reset email. Please try again.');
    } finally { setLoadingProvider(null); }
  };

  const isLoading = loadingProvider !== null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-container auth-modal-v2" onClick={e => e.stopPropagation()}>
        <button className="auth-close-btn" onClick={onClose} aria-label="Close modal">
          <X size={20} />
        </button>

        {/* ═══ VERIFY EMAIL SCREEN ═══ */}
        {screen === 'verify_email' && (
          <div className="auth-screen auth-verify-screen">
            <div className="auth-verify-icon-wrap">
              <Mail size={36} strokeWidth={1.5} />
            </div>
            <h2 className="auth-title">Check Your Inbox</h2>
            <p className="auth-verify-desc">
              We've sent a verification link to <strong>{verifyEmail}</strong>.
              Click the link in the email to activate your account and start shopping.
            </p>
            <div className="auth-verify-steps">
              <div className="auth-verify-step"><span>1</span>Open your email app</div>
              <div className="auth-verify-step"><span>2</span>Find the email from YARL SIHINA</div>
              <div className="auth-verify-step"><span>3</span>Click <em>"Verify My Account"</em></div>
            </div>
            <p className="auth-verify-spam">
              Don't see it? Check your <strong>Spam</strong> or <strong>Promotions</strong> folder.
            </p>
            <button className="auth-back-link" onClick={() => resetState('login')}>
              <ArrowLeft size={14} /> Back to Sign In
            </button>
          </div>
        )}

        {/* ═══ RESET EMAIL SENT SCREEN ═══ */}
        {screen === 'reset_sent' && (
          <div className="auth-screen auth-verify-screen">
            <div className="auth-verify-icon-wrap auth-verify-icon-success">
              <CheckCircle2 size={36} strokeWidth={1.5} />
            </div>
            <h2 className="auth-title">Reset Link Sent</h2>
            <p className="auth-verify-desc">
              A password reset link was sent to <strong>{verifyEmail}</strong>.
              The link expires in 1 hour.
            </p>
            <button className="auth-back-link" onClick={() => resetState('login')}>
              <ArrowLeft size={14} /> Back to Sign In
            </button>
          </div>
        )}

        {/* ═══ FORGOT PASSWORD SCREEN ═══ */}
        {screen === 'forgot_password' && (
          <div className="auth-screen">
            <button className="auth-back-link auth-back-top" onClick={() => resetState('login')}>
              <ArrowLeft size={14} /> Back
            </button>
            <div className="auth-header">
              <h2 className="auth-title">Forgot Password</h2>
              <p className="auth-subtitle">Enter your account email and we'll send you a reset link.</p>
            </div>
            {errorMsg && <div className="auth-error-banner"><AlertCircle size={16} /><span>{errorMsg}</span></div>}
            <form className="auth-email-form" onSubmit={handleForgotPassword} noValidate>
              <div className="auth-field-group">
                <label htmlFor="reset-email">Email Address</label>
                <div className="auth-input-wrap">
                  <Mail size={16} className="auth-input-icon" />
                  <input
                    id="reset-email" type="email" name="email"
                    placeholder="your@email.com"
                    value={form.email} onChange={handleField}
                    autoComplete="email" required
                  />
                </div>
              </div>
              <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                {loadingProvider === 'reset' ? <><Loader2 size={16} className="auth-spin" /> Sending...</> : 'Send Reset Link'}
              </button>
            </form>
          </div>
        )}

        {/* ═══ LOGIN SCREEN ═══ */}
        {screen === 'login' && (
          <div className="auth-screen">
            <div className="auth-header">
              <div className="auth-tag">
                <Sparkles size={13} className="text-caramel" />
                <span>MEMBER EXCLUSIVE · உறுப்பினர்</span>
              </div>
              <h2 className="auth-title">Welcome Back</h2>
              <p className="auth-tamil-calligraphy">யாழ் சிஹினா குடும்பத்திற்கு நல்வரவு</p>
              <p className="auth-subtitle">Sign in to track orders, save your address, and get VIP drop alerts.</p>
            </div>

            {errorMsg && <div className="auth-error-banner"><AlertCircle size={16} /><span>{errorMsg}</span></div>}
            {!isConfigured && (
              <div className="auth-demo-notice"><CheckCircle2 size={15} /><span>Preview Mode: instant sign-in simulation active</span></div>
            )}

            {/* Email/Password Form */}
            <form className="auth-email-form" onSubmit={handleEmailLogin} noValidate>
              <div className="auth-field-group">
                <label htmlFor="login-email">Email Address</label>
                <div className="auth-input-wrap">
                  <Mail size={16} className="auth-input-icon" />
                  <input id="login-email" type="email" name="email" placeholder="your@email.com"
                    value={form.email} onChange={handleField} autoComplete="email" required />
                </div>
              </div>
              <div className="auth-field-group">
                <label htmlFor="login-password">
                  Password
                  <button type="button" className="auth-forgot-inline" onClick={() => resetState('forgot_password')}>
                    Forgot password?
                  </button>
                </label>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <input id="login-password" type={showPass ? 'text' : 'password'} name="password"
                    placeholder="••••••••" value={form.password} onChange={handleField}
                    autoComplete="current-password" required />
                  <button type="button" className="auth-eye-btn" onClick={() => setShowPass(p => !p)} tabIndex={-1}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
              <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                {loadingProvider === 'email' ? <><Loader2 size={16} className="auth-spin" /> Signing In...</> : 'Sign In'}
              </button>
            </form>

            <div className="auth-divider"><span>or continue with</span></div>

            {/* Social Buttons */}
            <div className="auth-buttons-group">
              <button type="button" className="social-auth-btn google-btn" onClick={handleGoogle} disabled={isLoading}>
                <svg className="social-icon" viewBox="0 0 24 24" width="18" height="18">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>{loadingProvider === 'google' ? 'Connecting...' : 'Google'}</span>
              </button>
              <button type="button" className="social-auth-btn facebook-btn" onClick={handleFacebook} disabled={isLoading}>
                <svg className="social-icon" viewBox="0 0 24 24" width="18" height="18" fill="#1877F2">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span>{loadingProvider === 'facebook' ? 'Connecting...' : 'Facebook'}</span>
              </button>
            </div>

            <p className="auth-switch-screen">
              New to YARL SIHINA?{' '}
              <button type="button" onClick={() => resetState('signup')}>Create an account →</button>
            </p>
            <div className="auth-footer-terms">
              By signing in, you agree to YARL SIHINA's <a href="#privacy">Privacy Policy</a> and <a href="#terms">Terms of Service</a>.
            </div>
          </div>
        )}

        {/* ═══ SIGN-UP SCREEN ═══ */}
        {screen === 'signup' && (
          <div className="auth-screen">
            <button className="auth-back-link auth-back-top" onClick={() => resetState('login')}>
              <ArrowLeft size={14} /> Back to Sign In
            </button>
            <div className="auth-header">
              <div className="auth-tag"><Sparkles size={13} /><span>JOIN THE FAMILY · குடும்பத்தில் சேருங்கள்</span></div>
              <h2 className="auth-title">Create Account</h2>
              <p className="auth-subtitle">Join YARL SIHINA — get early access to drops, track orders, and save your addresses.</p>
            </div>

            {errorMsg && <div className="auth-error-banner"><AlertCircle size={16} /><span>{errorMsg}</span></div>}

            <form className="auth-email-form" onSubmit={handleEmailSignup} noValidate>
              <div className="auth-field-group">
                <label htmlFor="signup-name">Full Name</label>
                <div className="auth-input-wrap">
                  <User size={16} className="auth-input-icon" />
                  <input id="signup-name" type="text" name="name" placeholder="Priyantha Silva"
                    value={form.name} onChange={handleField} autoComplete="name" required />
                </div>
              </div>
              <div className="auth-field-group">
                <label htmlFor="signup-email">Email Address</label>
                <div className="auth-input-wrap">
                  <Mail size={16} className="auth-input-icon" />
                  <input id="signup-email" type="email" name="email" placeholder="your@email.com"
                    value={form.email} onChange={handleField} autoComplete="email" required />
                </div>
              </div>
              <div className="auth-field-group">
                <label htmlFor="signup-password">Password <span className="auth-field-hint">(min. 8 characters)</span></label>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <input id="signup-password" type={showPass ? 'text' : 'password'} name="password"
                    placeholder="Create a strong password" value={form.password} onChange={handleField}
                    autoComplete="new-password" required />
                  <button type="button" className="auth-eye-btn" onClick={() => setShowPass(p => !p)} tabIndex={-1}>
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {form.password.length > 0 && (
                  <div className="auth-password-strength">
                    <div className={`auth-strength-bar ${form.password.length >= 12 ? 'strong' : form.password.length >= 8 ? 'medium' : 'weak'}`} />
                    <span>{form.password.length >= 12 ? 'Strong' : form.password.length >= 8 ? 'Good' : 'Too short'}</span>
                  </div>
                )}
              </div>
              <div className="auth-field-group">
                <label htmlFor="signup-confirm">Confirm Password</label>
                <div className="auth-input-wrap">
                  <Lock size={16} className="auth-input-icon" />
                  <input id="signup-confirm" type={showPass ? 'text' : 'password'} name="confirmPassword"
                    placeholder="Repeat your password" value={form.confirmPassword} onChange={handleField}
                    autoComplete="new-password" required />
                  {form.confirmPassword && (
                    <span className={`auth-match-icon ${form.password === form.confirmPassword ? 'match' : 'mismatch'}`}>
                      {form.password === form.confirmPassword ? <CheckCircle2 size={15} /> : <X size={15} />}
                    </span>
                  )}
                </div>
              </div>
              <button type="submit" className="auth-submit-btn" disabled={isLoading}>
                {loadingProvider === 'email'
                  ? <><Loader2 size={16} className="auth-spin" /> Creating Account...</>
                  : 'Create Account & Verify Email'}
              </button>
            </form>

            <p className="auth-switch-screen">
              Already have an account?{' '}
              <button type="button" onClick={() => resetState('login')}>Sign in →</button>
            </p>
            <div className="auth-footer-terms">
              By creating an account, you agree to YARL SIHINA's <a href="#privacy">Privacy Policy</a> and <a href="#terms">Terms of Service</a>.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
