import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Mail, Lock, User as UserIcon, Shield, ArrowLeft, RefreshCw, KeyRound } from 'lucide-react';
import { GoogleLogin } from '@react-oauth/google';
import { API_BASE_URL } from '../config/api';
import './AuthPages.css';

const Register = () => {
  const { register, verifyRegistrationOTP, resend2FAOTP, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState('');
  const [usernameMessage, setUsernameMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('player');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // OTP Registration States
  const [registerChallenge, setRegisterChallenge] = useState(null);
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMessage, setResendMessage] = useState('');
  const digitInputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  // Google OAuth states
  const [googleLoading, setGoogleLoading] = useState(false);
  const [pendingGoogleSignup, setPendingGoogleSignup] = useState(null);
  const [googleUsername, setGoogleUsername] = useState('');
  const [googleUsernameStatus, setGoogleUsernameStatus] = useState('');
  const [googleUsernameMessage, setGoogleUsernameMessage] = useState('');

  // Debounced check for registration username
  useEffect(() => {
    if (!username) {
      setUsernameStatus('');
      setUsernameMessage('');
      return;
    }

    if (username.length < 3) {
      setUsernameStatus('short');
      setUsernameMessage('Username must be at least 3 characters long');
      return;
    }

    if (username.length > 20) {
      setUsernameStatus('invalid');
      setUsernameMessage('Username cannot exceed 20 characters');
      return;
    }

    const regex = /^[a-zA-Z0-9_.-]+$/;
    if (!regex.test(username)) {
      setUsernameStatus('invalid');
      setUsernameMessage('Alphanumeric, dots, hyphens, and underscores only');
      return;
    }

    setUsernameStatus('checking');
    setUsernameMessage('Checking availability...');

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/check-username?username=${encodeURIComponent(username)}`);
        const data = await res.json();
        if (res.ok) {
          if (data.available) {
            setUsernameStatus('available');
            setUsernameMessage('✓ Username available');
          } else {
            setUsernameStatus('taken');
            setUsernameMessage('✗ Username already taken');
          }
        } else {
          setUsernameStatus('invalid');
          setUsernameMessage(data.message || 'Error checking availability');
        }
      } catch (err) {
        setUsernameStatus('invalid');
        setUsernameMessage('Could not connect to server to verify username');
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [username]);

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

  // Resend Cooldown Countdown
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    if (value && index < 5) {
      digitInputRefs[index + 1].current?.focus();
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      digitInputRefs[index - 1].current?.focus();
    }
  };

  const handleDigitPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtpDigits(digits);
      digitInputRefs[5].current?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (usernameStatus === 'taken' || usernameStatus === 'invalid' || usernameStatus === 'short') {
      setError(usernameMessage || 'Please choose a valid and available username first.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const challengeData = await register(username, email, password, role);
      setRegisterChallenge(challengeData);
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyRegistrationOTP = async (e) => {
    e.preventDefault();
    const code = otpDigits.join('');
    if (code.length !== 6) {
      setError('Please enter the full 6-digit verification code.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const user = await verifyRegistrationOTP(registerChallenge.challengeId, code);
      if (user.role === 'organizer') navigate('/organizer-dashboard');
      else navigate('/player-dashboard');
    } catch (err) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setResendMessage('');

    try {
      const res = await resend2FAOTP(registerChallenge.challengeId);
      setResendMessage(res.message || 'Verification code resent!');
      setResendCooldown(60);
      setOtpDigits(['', '', '', '', '', '']);
      digitInputRefs[0].current?.focus();
    } catch (err) {
      setError(err.message || 'Failed to resend code.');
    }
  };

  // Real Google Sign-in Callback Response
  const handleGoogleCallback = async (response) => {
    setError('');
    setGoogleLoading(true);
    try {
      const userOrMeta = await loginWithGoogle({
        credential: response.credential,
        role: role, // Use selected role for new registration
      });
      if (userOrMeta.requireUsername) {
        // First time signup requires choosing a username
        setPendingGoogleSignup({ ...userOrMeta, credential: response.credential });
      } else {
        if (userOrMeta.role === 'organizer') navigate('/organizer-dashboard');
        else navigate('/player-dashboard');
      }
    } catch (err) {
      setError(err.message || 'Google registration failed.');
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

      const user = await loginWithGoogle(payload);
      if (user.role === 'organizer') navigate('/organizer-dashboard');
      else navigate('/player-dashboard');
    } catch (err) {
      setError(err.message || 'Failed to complete Google registration.');
    } finally {
      setLoading(false);
    }
  };

  if (registerChallenge) {
    return (
      <div className="auth-page container">
        <div className="auth-card glass-panel-glow">
          <div className="auth-header text-center">
            <div className="auth-icon-badge" style={{ borderColor: 'rgba(139, 92, 246, 0.4)', background: 'rgba(139, 92, 246, 0.1)' }}>
              <KeyRound size={28} className="text-primary" />
            </div>
            <h2>Verify Your Email Address</h2>
            <p className="text-secondary text-sm">
              We sent a 6-digit verification code to: <br />
              <strong style={{ color: '#a78bfa', fontSize: '0.95rem' }}>{registerChallenge.maskedEmail || email}</strong>
            </p>
          </div>

          {error && <div className="auth-error-banner">{error}</div>}
          {resendMessage && (
            <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', color: '#4ade80', padding: '8px 12px', borderRadius: '8px', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1rem' }}>
              ✓ {resendMessage}
            </div>
          )}

          <form onSubmit={handleVerifyRegistrationOTP} className="auth-form">
            <div className="otp-input-container">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={digitInputRefs[idx]}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                  onPaste={idx === 0 ? handleDigitPaste : undefined}
                  className="otp-digit-box"
                  autoFocus={idx === 0}
                  required
                />
              ))}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg mt-3"
              disabled={loading || otpDigits.join('').length !== 6}
            >
              {loading ? 'Verifying Code...' : 'Verify Code & Finalize Account'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', fontSize: '0.85rem' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleResendOTP}
                disabled={resendCooldown > 0}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <RefreshCw size={14} /> {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend Code'}
              </button>

              <button
                type="button"
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => {
                  setRegisterChallenge(null);
                  setError('');
                  setResendMessage('');
                }}
              >
                <ArrowLeft size={14} /> Back to Register
              </button>
            </div>
          </form>
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
          <div className="auth-icon-badge">
            <UserPlus size={28} />
          </div>
          <h2>Create Account</h2>
          <p>Join Arena-Verse to play or organize tournaments.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error-banner">{error}</div>}

          <div className="form-group">
            <label className="form-label">Username</label>
            <div className="input-with-icon">
              <UserIcon className="input-icon" size={16} />
              <input 
                type="text" 
                className="form-control" 
                placeholder="gamer_tag" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            {usernameMessage && (
              <small className={usernameStatus === 'available' ? 'success-text' : 'error-text'} style={{ display: 'block', marginTop: '5px' }}>
                {usernameMessage}
              </small>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div className="input-with-icon">
              <Mail className="input-icon" size={16} />
              <input 
                type="email" 
                className="form-control" 
                placeholder="player@gmail.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="input-with-icon">
              <Lock className="input-icon" size={16} />
              <input 
                type="password" 
                className="form-control" 
                placeholder="At least 6 characters" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minlength="6"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Account Role (Applies also for Google Sign-Ups)</label>
            <div className="role-selector-group">
              <label className={`role-option-card ${role === 'player' ? 'selected' : ''}`}>
                <input 
                  type="radio" 
                  name="role" 
                  value="player" 
                  checked={role === 'player'}
                  onChange={() => setRole('player')}
                />
                <UserIcon className="option-icon" size={18} />
                <div>
                  <span className="option-title">Player</span>
                  <span className="option-desc">Join tournaments & squads</span>
                </div>
              </label>

              <label className={`role-option-card ${role === 'organizer' ? 'selected' : ''}`}>
                <input 
                  type="radio" 
                  name="role" 
                  value="organizer" 
                  checked={role === 'organizer'}
                  onChange={() => setRole('organizer')}
                />
                <Shield className="option-icon" size={18} />
                <div>
                  <span className="option-title">Organizer</span>
                  <span className="option-desc">Create/publish brackets</span>
                </div>
              </label>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
            {loading ? 'Creating Account...' : 'Register'}
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
          <p>Already have an account? <Link to="/login">Login here</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Register;
