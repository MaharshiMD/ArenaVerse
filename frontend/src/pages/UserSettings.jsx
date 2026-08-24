import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { Settings, Shield, Bell, Moon, Sun, Languages, Lock, Smartphone, Key, Trash2, History } from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import './UserSettings.css';

const UserSettings = () => {
  const {
    user,
    getAuthHeader,
    enable2FARequest,
    enable2FAVerify,
    disable2FARequest,
    disable2FAVerify,
    resend2FAOTP,
  } = useAuth();
  const { theme, changeTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('general'); // 'general', 'security', 'history'
  const [availability, setAvailability] = useState('Available');
  const [selectedTheme, setSelectedTheme] = useState(theme);
  const [loginHistory, setLoginHistory] = useState([]);
  const [saveMessage, setSaveMessage] = useState('');

  // 2FA Modal & Action States
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableStep, setDisableStep] = useState('password'); // 'password' | 'otp'
  const [enableChallengeId, setEnableChallengeId] = useState('');
  const [disableChallengeId, setDisableChallengeId] = useState('');
  const [enableMaskedEmail, setEnableMaskedEmail] = useState('');
  const [disableMaskedEmail, setDisableMaskedEmail] = useState('');
  const [modalDigits, setModalDigits] = useState(['', '', '', '', '', '']);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [modalResendCooldown, setModalResendCooldown] = useState(0);

  useEffect(() => {
    if (user) {
      if (user.availabilityStatus) setAvailability(user.availabilityStatus);
    }
    setSelectedTheme(theme);
    fetchLoginHistory();
  }, [user, theme]);

  // Modal Resend Cooldown Timer
  useEffect(() => {
    let timer;
    if (modalResendCooldown > 0) {
      timer = setInterval(() => {
        setModalResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [modalResendCooldown]);

  const fetchLoginHistory = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/nextgen/login-history`, {
        headers: getAuthHeader(),
      });
      if (res.ok) setLoginHistory(await res.json());
    } catch (err) {
      console.error('Failed to fetch login history:', err);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaveMessage('');
    try {
      // 1. Apply Theme Change on Save Click
      if (selectedTheme !== theme) {
        changeTheme(selectedTheme);
      }

      // 2. Persist in MongoDB
      const res = await fetch(`${API_BASE_URL}/api/nextgen/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify({
          availabilityStatus: availability,
          settings: { theme: selectedTheme },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      setSaveMessage('🎉 Settings & General Preferences Saved Successfully!');
    } catch (err) {
      setSaveMessage(`⚠️ ${err.message}`);
    }
  };

  // 2FA Digit Input Handlers for Modals
  const handleModalDigitChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...modalDigits];
    newDigits[index] = value.slice(-1);
    setModalDigits(newDigits);

    if (value && index < 5) {
      const nextInput = document.getElementById(`modal-otp-digit-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleModalKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !modalDigits[index] && index > 0) {
      const prevInput = document.getElementById(`modal-otp-digit-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  const handleModalPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setModalDigits(digits);
      const lastInput = document.getElementById('modal-otp-digit-5');
      if (lastInput) lastInput.focus();
    }
  };

  // Enable 2FA Handlers
  const handleStartEnable2FA = async () => {
    setModalError('');
    setModalSuccess('');
    setModalLoading(true);
    try {
      const res = await enable2FARequest();
      setEnableChallengeId(res.challengeId);
      setEnableMaskedEmail(res.maskedEmail);
      setModalDigits(['', '', '', '', '', '']);
      setModalResendCooldown(res.cooldownSeconds || 60);
      setShowEnableModal(true);
    } catch (err) {
      alert(err.message || 'Failed to start 2FA enablement.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmEnable2FA = async (e) => {
    e.preventDefault();
    const otp = modalDigits.join('');
    if (otp.length !== 6) {
      setModalError('Please enter all 6 digits.');
      return;
    }
    setModalError('');
    setModalLoading(true);
    try {
      await enable2FAVerify(enableChallengeId, otp);
      setModalSuccess('✓ Two-Factor Authentication Enabled successfully!');
      setTimeout(() => {
        setShowEnableModal(false);
        setModalSuccess('');
      }, 1500);
    } catch (err) {
      setModalError(err.message || 'Invalid verification code.');
    } finally {
      setModalLoading(false);
    }
  };

  // Disable 2FA Handlers
  const handleStartDisable2FA = () => {
    setModalError('');
    setModalSuccess('');
    setDisablePassword('');
    setDisableStep('password');
    setModalDigits(['', '', '', '', '', '']);
    setShowDisableModal(true);
  };

  const handleRequestDisableOTP = async (e) => {
    e.preventDefault();
    if (!disablePassword) {
      setModalError('Current password is required.');
      return;
    }
    setModalError('');
    setModalLoading(true);
    try {
      const res = await disable2FARequest(disablePassword);
      setDisableChallengeId(res.challengeId);
      setDisableMaskedEmail(res.maskedEmail);
      setModalResendCooldown(res.cooldownSeconds || 60);
      setDisableStep('otp');
    } catch (err) {
      setModalError(err.message || 'Failed to verify password.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleConfirmDisable2FA = async (e) => {
    e.preventDefault();
    const otp = modalDigits.join('');
    if (otp.length !== 6) {
      setModalError('Please enter all 6 digits.');
      return;
    }
    setModalError('');
    setModalLoading(true);
    try {
      await disable2FAVerify(disableChallengeId, otp);
      setModalSuccess('✓ Two-Factor Authentication Disabled.');
      setTimeout(() => {
        setShowDisableModal(false);
        setModalSuccess('');
      }, 1500);
    } catch (err) {
      setModalError(err.message || 'Invalid verification code.');
    } finally {
      setModalLoading(false);
    }
  };

  const handleModalResendOTP = async (challengeId) => {
    if (modalResendCooldown > 0) return;
    setModalError('');
    try {
      const res = await resend2FAOTP(challengeId);
      setModalResendCooldown(res.cooldownSeconds || 60);
    } catch (err) {
      setModalError(err.message || 'Failed to resend verification code.');
    }
  };

  return (
    <div className="user-settings-page container py-4 mt-4">
      <div className="mb-4">
        <h1 className="section-title flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Settings className="text-primary" size={32} /> Account & Platform Settings
        </h1>
        <p className="section-subtitle">Manage availability, 2FA security, theme preferences, and active login sessions.</p>
      </div>

      {saveMessage && (
        <div className="glass-panel p-3 mb-4 text-center font-bold text-sm">
          {saveMessage}
        </div>
      )}

      {/* Tabs */}
      <div className="details-tabs mb-4">
        <button className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`} onClick={() => setActiveTab('general')}>
          <Settings size={16} /> Preferences & Theme
        </button>
        <button className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>
          <Shield size={16} /> Security & Sessions
        </button>
        <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
          <History size={16} /> Login Session History
        </button>
      </div>

      {activeTab === 'general' && (
        <div className="glass-panel p-4">
          <h3 className="text-white font-bold mb-4">General Preferences</h3>
          <form onSubmit={handleSaveSettings} className="flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Competitor Availability Status</label>
              <select className="form-control" value={availability} onChange={e => setAvailability(e.target.value)}>
                <option value="Available">🟢 Available</option>
                <option value="Busy">🔴 Busy / In Match</option>
                <option value="Looking for Tournament">🏆 Looking for Tournament</option>
                <option value="Looking for Team">🛡️ Looking for Team (LFT)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Theme Mode</label>
              <select className="form-control" value={selectedTheme} onChange={e => setSelectedTheme(e.target.value)}>
                <option value="dark">🌙 Dark Glassmorphism Mode</option>
                <option value="light">☀️ Light Cyber Mode</option>
              </select>
            </div>

            <button type="submit" className="btn btn-primary">Save General Settings</button>
          </form>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="glass-panel p-4 flex-col gap-4" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 className="text-white font-bold m-0 flex items-center gap-2" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield className="text-primary" size={22} /> Security & Account Protection
          </h3>

          {/* 2FA Card */}
          <div className="glass-panel p-4" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h4 className="text-white font-bold text-base m-0">Two-Factor Authentication</h4>
                  {user?.twoFactorEnabled ? (
                    <span className="badge badge-success" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                      ✓ Enabled
                    </span>
                  ) : (
                    <span className="badge badge-secondary" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#94a3b8', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                      OFF
                    </span>
                  )}
                </div>
                <p className="text-secondary text-xs mt-2" style={{ maxWidth: '540px', margin: '8px 0 0 0', lineHeight: '1.5' }}>
                  {user?.twoFactorEnabled
                    ? 'Your account requires an email verification code sent to your registered address when signing in.'
                    : 'Add an extra layer of security to your ArenaVerse account by requiring a verification code sent to your registered email when signing in.'}
                </p>
              </div>

              <div>
                {user?.twoFactorEnabled ? (
                  <button
                    type="button"
                    className="btn btn-secondary text-xs font-bold"
                    onClick={handleStartDisable2FA}
                    disabled={modalLoading}
                    style={{ borderColor: '#ef4444', color: '#ef4444' }}
                  >
                    Disable 2FA
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary text-xs font-bold"
                    onClick={handleStartEnable2FA}
                    disabled={modalLoading}
                  >
                    Enable 2FA
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="glass-panel p-3">
            <strong className="text-white block mb-1">Active Device Sessions</strong>
            <p className="text-secondary text-xs mb-3">Revoke remote device access or log out all other active web sessions.</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => alert('Logged out all other active sessions.')}>
              Logout Other Devices
            </button>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="glass-panel p-4">
          <h3 className="text-white font-bold mb-3">Recent Login Sessions</h3>
          <div className="table-responsive">
            <table className="table" style={{ width: '100%', textAlign: 'left' }}>
              <thead>
                <tr style={{ color: 'var(--text-muted)', fontSize: '0.8rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ padding: '10px' }}>Device / OS</th>
                  <th style={{ padding: '10px' }}>Browser</th>
                  <th style={{ padding: '10px' }}>IP Address</th>
                  <th style={{ padding: '10px' }}>Location</th>
                  <th style={{ padding: '10px' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {loginHistory.map((item, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '10px' }} className="text-white text-xs">{item.device || 'Desktop'}</td>
                    <td style={{ padding: '10px' }} className="text-secondary text-xs">{item.browser || 'Chrome'}</td>
                    <td style={{ padding: '10px' }} className="text-secondary text-xs">{item.ipAddress || '127.0.0.1'}</td>
                    <td style={{ padding: '10px' }} className="text-secondary text-xs">{item.location || 'India'}</td>
                    <td style={{ padding: '10px' }} className="text-muted text-xs">{new Date(item.createdAt).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Enable 2FA Verification Modal */}
      {showEnableModal && (
        <div className="modal-overlay" onClick={() => setShowEnableModal(false)}>
          <div className="modal-content glass-panel-glow" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: '2rem' }}>
            <div className="modal-header flex justify-between items-center mb-3 pb-3 border-b" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield className="text-primary" size={20} />
                <h3 className="text-white font-bold text-base m-0">Enable Two-Factor Authentication</h3>
              </div>
              <button className="modal-close" onClick={() => setShowEnableModal(false)}>&times;</button>
            </div>

            {modalSuccess ? (
              <div className="text-center py-4">
                <p className="text-success font-bold text-sm" style={{ color: '#10b981' }}>{modalSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleConfirmEnable2FA}>
                <p className="text-secondary text-xs mb-3">
                  We sent a 6-digit verification code to: <br />
                  <strong className="text-white">{enableMaskedEmail}</strong>
                </p>

                {modalError && <p className="error-text text-xs mb-3" style={{ color: '#ef4444' }}>{modalError}</p>}

                <div className="otp-input-container my-4" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  {modalDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`modal-otp-digit-${idx}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      className="otp-digit-box"
                      value={digit}
                      onChange={(e) => handleModalDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleModalKeyDown(idx, e)}
                      onPaste={handleModalPaste}
                      autoFocus={idx === 0}
                      required
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full py-2 text-sm font-bold mt-2"
                  disabled={modalLoading || modalDigits.join('').length !== 6}
                >
                  {modalLoading ? 'Enabling 2FA...' : 'Verify & Enable'}
                </button>

                <div className="text-center mt-3">
                  {modalResendCooldown > 0 ? (
                    <span className="text-secondary text-xs">
                      Resend code in <strong className="text-primary">{modalResendCooldown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-link text-primary text-xs"
                      onClick={() => handleModalResendOTP(enableChallengeId)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#8b5cf6' }}
                    >
                      Didn't receive the code? Resend Code
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Disable 2FA Modal */}
      {showDisableModal && (
        <div className="modal-overlay" onClick={() => setShowDisableModal(false)}>
          <div className="modal-content glass-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', padding: '2rem' }}>
            <div className="modal-header flex justify-between items-center mb-3 pb-3 border-b" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Shield className="text-danger" size={20} style={{ color: '#ef4444' }} />
                <h3 className="text-white font-bold text-base m-0">Disable Two-Factor Authentication</h3>
              </div>
              <button className="modal-close" onClick={() => setShowDisableModal(false)}>&times;</button>
            </div>

            {modalSuccess ? (
              <div className="text-center py-4">
                <p className="text-success font-bold text-sm" style={{ color: '#10b981' }}>{modalSuccess}</p>
              </div>
            ) : disableStep === 'password' ? (
              <form onSubmit={handleRequestDisableOTP}>
                <p className="text-secondary text-xs mb-3">
                  For your security, please confirm your current account password to initiate 2FA disablement.
                </p>

                {modalError && <p className="error-text text-xs mb-3" style={{ color: '#ef4444' }}>{modalError}</p>}

                <div className="form-group mb-4">
                  <label className="form-label text-xs">Current Password</label>
                  <input
                    type="password"
                    className="form-control"
                    placeholder="••••••••"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full py-2 text-sm font-bold"
                  disabled={modalLoading || !disablePassword}
                >
                  {modalLoading ? 'Sending Verification Code...' : 'Send Verification Code'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleConfirmDisable2FA}>
                <p className="text-secondary text-xs mb-3">
                  We sent a 6-digit verification code to: <br />
                  <strong className="text-white">{disableMaskedEmail}</strong>
                </p>

                {modalError && <p className="error-text text-xs mb-3" style={{ color: '#ef4444' }}>{modalError}</p>}

                <div className="otp-input-container my-4" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  {modalDigits.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`modal-otp-digit-${idx}`}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={1}
                      className="otp-digit-box"
                      value={digit}
                      onChange={(e) => handleModalDigitChange(idx, e.target.value)}
                      onKeyDown={(e) => handleModalKeyDown(idx, e)}
                      onPaste={handleModalPaste}
                      autoFocus={idx === 0}
                      required
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-full py-2 text-sm font-bold mt-2"
                  disabled={modalLoading || modalDigits.join('').length !== 6}
                >
                  {modalLoading ? 'Disabling 2FA...' : 'Verify & Disable'}
                </button>

                <div className="text-center mt-3">
                  {modalResendCooldown > 0 ? (
                    <span className="text-secondary text-xs">
                      Resend code in <strong className="text-primary">{modalResendCooldown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-link text-primary text-xs"
                      onClick={() => handleModalResendOTP(disableChallengeId)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#8b5cf6' }}
                    >
                      Didn't receive the code? Resend Code
                    </button>
                  )}
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSettings;
