import React, { createContext, useState, useEffect, useContext } from 'react';
import { API_BASE_URL } from '../config/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  // Set Authorization Header utility
  const getAuthHeader = () => {
    const activeToken = token || localStorage.getItem('token') || '';
    return activeToken ? { 'Authorization': `Bearer ${activeToken}` } : {};
  };

  // Fetch current user details on token change
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const data = await res.json();
          const normalized = { ...data, id: data._id || data.id };
          setUser(normalized);
          if (normalized.settings?.theme) {
            localStorage.setItem('arenaverse-theme', normalized.settings.theme);
            document.documentElement.setAttribute('data-theme', normalized.settings.theme);
          }
        } else {
          // Token expired or invalid
          logout();
        }
      } catch (err) {
        console.error('Failed to load user profile', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');

      if (data.requiresTwoFactor) {
        return data; // Return 2FA challenge payload
      }

      localStorage.setItem('token', data.token);
      setToken(data.token);
      const normalizedUser = { ...data.user, id: data.user.id || data.user._id };
      setUser(normalizedUser);
      return normalizedUser;
    } catch (err) {
      throw err;
    }
  };

  const initiateRegistration = async (username, email, password, role) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/2fa/register/initiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password, role }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Registration failed');
      return data; // returns { message, challengeId, maskedEmail, cooldownSeconds }
    } catch (err) {
      throw err;
    }
  };

  const verifyRegistrationOTP = async (challengeId, otp) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/2fa/register/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification failed');

      localStorage.setItem('token', data.token);
      setToken(data.token);
      const normalizedUser = { ...data.user, id: data.user.id || data.user._id };
      setUser(normalizedUser);
      return normalizedUser;
    } catch (err) {
      throw err;
    }
  };

  const register = async (username, email, password, role) => {
    return initiateRegistration(username, email, password, role);
  };

  const loginWithGoogle = async (googleUserData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(googleUserData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Google authentication failed');

      if (data.requireUsername) {
        return data; // Return raw metadata if username entry is explicitly requested
      }

      if (data.requiresTwoFactor) {
        return data; // Return 2FA challenge payload
      }

      localStorage.setItem('token', data.token);
      setToken(data.token);
      const normalizedUser = { ...data.user, id: data.user.id || data.user._id };
      setUser(normalizedUser);
      return normalizedUser;
    } catch (err) {
      throw err;
    }
  };

  const verify2FALogin = async (challengeId, otp) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/2fa/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId, otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Verification failed');

      localStorage.setItem('token', data.token);
      setToken(data.token);
      const normalizedUser = { ...data.user, id: data.user.id || data.user._id };
      setUser(normalizedUser);
      return normalizedUser;
    } catch (err) {
      throw err;
    }
  };

  const resend2FAOTP = async (challengeId) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/2fa/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to resend code');
    return data;
  };

  const enable2FARequest = async () => {
    const res = await fetch(`${API_BASE_URL}/api/auth/2fa/enable`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to initiate 2FA enablement');
    return data;
  };

  const enable2FAVerify = async (challengeId, otp) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/2fa/enable/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ challengeId, otp }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Verification failed');

    setUser((prev) => (prev ? { ...prev, twoFactorEnabled: true } : prev));
    return data;
  };

  const disable2FARequest = async (password) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/2fa/disable/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to initiate 2FA disablement');
    return data;
  };

  const disable2FAVerify = async (challengeId, otp) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/2fa/disable/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ challengeId, otp }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Verification failed');

    setUser((prev) => (prev ? { ...prev, twoFactorEnabled: false } : prev));
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setLoading(false);
  };

  const updateProfile = async (profileData) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeader(),
        },
        body: JSON.stringify(profileData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update profile');

      const normalizedUser = { ...data.user, id: data.user.id || data.user._id };
      setUser(normalizedUser);
      return normalizedUser;
    } catch (err) {
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        initiateRegistration,
        verifyRegistrationOTP,
        logout,
        updateProfile,
        loginWithGoogle,
        verify2FALogin,
        resend2FAOTP,
        enable2FARequest,
        enable2FAVerify,
        disable2FARequest,
        disable2FAVerify,
        getAuthHeader,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
