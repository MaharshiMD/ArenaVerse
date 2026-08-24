import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, User as UserIcon, ShieldCheck, ArrowLeft, RefreshCw, KeyRound } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { API_BASE_URL } from '../config/api';
import './AuthPages.css';

const Login = () => {
  const { login, loginWithGoogle, verify2FALogin, resend2FAOTP } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 2FA Challenge states
  const [twoFactorChallenge, setTwoFactorChallenge] = useState(null);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState('');

  // Google OAuth states
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pendingGoogleSignup, setPendingGoogleSignup] = useState(null);
  const [googleUsername, setGoogleUsername] = useState('');
  const [googleUsernameStatus, setGoogleUsernameStatus] = useState('');
  const [googleUsernameMessage, setGoogleUsernameMessage] = useState('');

  // Countdown timer for 2FA resend
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await login(email, password);
      if (result && result.requiresTwoFactor) {
        setTwoFactorChallenge(result);
        setResendCooldown(60);
        setOtpDigits(['', '', '', '', '', '']);
        return;
      }
      if (result.role === 'admin') navigate('/admin-dashboard');
      else if (result.role === 'organizer') navigate('/organizer-dashboard');
      else navigate('/player-dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  // 2FA Digit Input Handlers
  const handleDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-digit-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      const prevInput = document.getElementById(`otp-digit-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtpDigits(digits);
      const lastInput = document.getElementById('otp-digit-5');
      if (lastInput) lastInput.focus();
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    const otp = otpDigits.join('');
    if (otp.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setError('');
    setOtpLoading(true);

    try {
      const user = await verify2FALogin(twoFactorChallenge.challengeId, otp);
      if (user.role === 'admin') navigate('/admin-dashboard');
      else if (user.role === 'organizer') navigate('/organizer-dashboard');
      else navigate('/player-dashboard');
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setResendMessage('');
    try {
      const res = await resend2FAOTP(twoFactorChallenge.challengeId);
      setResendCooldown(res.cooldownSeconds || 60);
      setResendMessage('A new 6-digit verification code has been sent to your email.');
    } catch (err) {
      setError(err.message || 'Failed to resend verification code.');
    }
  };

  // Debounced check for Google username choice
  useEffect(() => {
    if (!googleUsername) {
      setGoogleUsernameStatus('');
      setGoogleUsernameMessage('');
      return;
    }

    if (googleUsername.length < 3) {
      setGoogleUsernameStatus('short');
      setGoogleUsernameMessage('Username must be at least 3 characters long');
      return;
    }

    if (googleUsername.length > 20) {
      setGoogleUsernameStatus('invalid');
      setGoogleUsernameMessage('Username cannot exceed 20 characters');
      return;
    }

    const regex = /^[a-zA-Z0-9_.-]+$/;
    if (!regex.test(googleUsername)) {
      setGoogleUsernameStatus('invalid');
      setGoogleUsernameMessage('Alphanumeric, dots, hyphens, and underscores only');
      return;
    }

    setGoogleUsernameStatus('checking');
    setGoogleUsernameMessage('Checking availability...');

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/check-username?username=${encodeURIComponent(googleUsername)}`);
        const data = await res.json();
        if (res.ok) {
          if (data.available) {
            setGoogleUsernameStatus('available');
            setGoogleUsernameMessage('✓ Username available');
          } else {
            setGoogleUsernameStatus('taken');
            setGoogleUsernameMessage('✗ Username already taken');
          }
        } else {
          setGoogleUsernameStatus('invalid');
          setGoogleUsernameMessage(data.message || 'Error checking availability');
        }
      } catch (err) {
        setGoogleUsernameStatus('invalid');
        setGoogleUsernameMessage('Could not connect to server to verify username');
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [googleUsername]);

  // Real Google Sign-in Callback Response
  const handleGoogleCallback = async (response) => {
    setError('');
    setGoogleLoading(true);
    try {
      const userOrMeta = await loginWithGoogle({
        credential: response.credential,
        role: 'player', // Default role for new Google sign ups
      });
      if (userOrMeta.requiresTwoFactor) {
        setTwoFactorChallenge(userOrMeta);
        setResendCooldown(60);
        setOtpDigits(['', '', '', '', '', '']);
      } else if (userOrMeta.requireUsername) {
        // First time signup requires choosing a username
        setPendingGoogleSignup({ ...userOrMeta, credential: response.credential });
      } else {
        if (userOrMeta.role === 'admin') navigate('/admin-dashboard');
        else if (userOrMeta.role === 'organizer') navigate('/organizer-dashboard');
        else navigate('/player-dashboard');
      }
    } catch (err) {
      setError(err.message || 'Google login failed.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleCompleteGoogleSignup = async (e) => {
    e.preventDefault();
    if (googleUsernameStatus !== 'available') {
      setError('Please choose a valid and available username first.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const payload = {
        email: pendingGoogleSignup.email,
        googleId: pendingGoogleSignup.googleId,
        role: pendingGoogleSignup.role,
        avatar: pendingGoogleSignup.avatar,
        username: googleUsername
      };
      if (pendingGoogleSignup.credential) {
        payload.credential = pendingGoogleSignup.credential;
      }

      const result = await loginWithGoogle(payload);
      if (result.requiresTwoFactor) {
        setTwoFactorChallenge(result);
        setResendCooldown(60);
        setOtpDigits(['', '', '', '', '', '']);
      } else {
        if (result.role === 'admin') navigate('/admin-dashboard');
        else if (result.role === 'organizer') navigate('/organizer-dashboard');
        else navigate('/player-dashboard');
      }
    } catch (err) {
      setError(err.message || 'Failed to complete Google registration.');
    } finally {
      setLoading(false);
    }
  };

  if (twoFactorChallenge) {
    return (
      <div className="auth-page container">
        <div className="auth-card glass-panel-glow">
          <div className="auth-header text-center">
            <div className="auth-icon-badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', margin: '0 auto 15px auto', width: '56px', height: '56px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={32} />
            </div>
            <h2 className="text-white font-bold">Verify Your Identity</h2>
            <p className="text-secondary text-sm mt-1">
              We've sent a 6-digit verification code to: <br />
              <strong className="text-white">{twoFactorChallenge.maskedEmail || 'your email'}</strong>
            </p>
          </div>

          {error && (
            <div className="auth-error-banner mb-4">
              <span>{error}</span>
            </div>
          )}

          {resendMessage && (
            <div className="success-banner mb-4" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', textAlign: 'center' }}>
              <span>{resendMessage}</span>
            </div>
          )}

          <form onSubmit={handleVerifyOTP} className="auth-form mt-4">
            <label className="form-label text-center block mb-3 text-secondary text-xs uppercase tracking-wider" style={{ display: 'block', textAlign: 'center', marginBottom: '12px' }}>
              Enter 6-Digit Verification Code
            </label>

            {/* 6-Digit OTP Input Boxes */}
            <div className="otp-input-container" style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  id={`otp-digit-${idx}`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  className="otp-digit-box"
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={handlePaste}
                  autoFocus={idx === 0}
                  required
                />
              ))}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full py-3"
              disabled={otpLoading || otpDigits.join('').length !== 6}
            >
              {otpLoading ? 'Verifying Code...' : 'Verify & Continue'}
            </button>
          </form>

          <div className="auth-footer text-center mt-4" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <div className="resend-container">
              {resendCooldown > 0 ? (
                <span className="text-secondary text-xs">
                  Resend code in <strong className="text-primary">{resendCooldown}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  className="btn btn-link text-primary text-xs flex items-center gap-1"
                  onClick={handleResendOTP}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#8b5cf6', fontSize: '13px', fontWeight: 'bold' }}
                >
                  <RefreshCw size={13} style={{ display: 'inline', marginRight: '4px' }} /> Didn't receive code? Resend
                </button>
              )}
            </div>

            <p className="text-muted text-xs" style={{ margin: '8px 0 0 0', color: '#64748b', fontSize: '11px', maxWidth: '340px', lineHeight: '1.4' }}>
              Lost access to your registered email address? Contact your ArenaVerse Platform Administrator for assisted 2FA account recovery.
            </p>

            <button
              type="button"
              className="btn btn-secondary btn-full btn-sm flex items-center justify-center gap-2 mt-2"
              onClick={() => {
                setTwoFactorChallenge(null);
                setError('');
                setResendMessage('');
                setOtpDigits(['', '', '', '', '', '']);
              }}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <ArrowLeft size={16} /> Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (pendingGoogleSignup) {
    return (
      <div className="auth-page container">
        <div className="auth-card glass-panel-glow">
          <div className="auth-header text-center">
            <div className="auth-icon-badge">
              <UserIcon size={28} />
            </div>
            <h2>Choose Your Username</h2>
            <p>Please select a unique username to complete your Google account setup.</p>
          </div>
          
          <form onSubmit={handleCompleteGoogleSignup} className="auth-form">
            {error && <div className="auth-error-banner">{error}</div>}
            
            <div className="form-group">
              <label className="form-label">Username</label>
              <div className="input-with-icon">
                <UserIcon className="input-icon" size={16} />
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="gamer_tag" 
                  value={googleUsername}
                  onChange={(e) => setGoogleUsername(e.target.value)}
                  required
                />
              </div>
              {googleUsernameMessage && (
                <small className={googleUsernameStatus === 'available' ? 'success-text' : 'error-text'} style={{ display: 'block', marginTop: '5px' }}>
                  {googleUsernameMessage}
                </small>
              )}
            </div>

            <button 
              type="submit" 
              className="btn btn-primary btn-full" 
              disabled={googleUsernameStatus !== 'available' || loading}
            >
              {loading ? 'Completing Setup...' : 'Complete Registration'}
            </button>
            
            <button 
              type="button" 
              className="btn btn-secondary btn-full mt-2" 
              onClick={() => {
                setPendingGoogleSignup(null);
                setGoogleUsername('');
                setGoogleUsernameStatus('');
                setGoogleUsernameMessage('');
                setError('');
              }}
            >
              Cancel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page container">
      <div className="auth-card">
        <div className="auth-header text-center">
          <div className="auth-logo">
            <LogIn className="logo-icon text-primary" size={32} />
          </div>
          <h2>Welcome Back</h2>
          <p className="text-secondary text-sm">Sign in to your ArenaVerse account to continue</p>
        </div>

        {error && (
          <div className="auth-error-banner">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Email Address or Username</label>
            <div className="input-with-icon">
              <Mail className="input-icon" size={18} />
              <input
                type="text"
                className="form-control"
                placeholder="Email address or username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-with-icon">
              <Lock className="input-icon" size={18} />
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="auth-divider-container">
          <span className="auth-divider-line"></span>
          <span className="auth-divider-text">OR</span>
          <span className="auth-divider-line"></span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
          <GoogleLogin
            onSuccess={handleGoogleCallback}
            onError={() => {
              setError('Google Login Failed');
            }}
            useOneTap
            shape="rectangular"
            theme="filled_black"
          />
        </div>

        <div className="auth-footer text-center">
          <p>Don't have an account? <Link to="/register">Register here</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
