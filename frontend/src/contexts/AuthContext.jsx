import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

/**
 * AuthContext — Community Hero Green
 * JWT-based auth: email/password + Google OAuth (consent screen).
 * Token stored in localStorage under key 'chg_token'.
 * Zero Firebase dependency.
 */

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading]         = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('chg_user');
    const token  = localStorage.getItem('chg_token');
    if (stored && token) {
      try { setCurrentUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  function _persist(token, user) {
    localStorage.setItem('chg_token', token);
    localStorage.setItem('chg_user', JSON.stringify(user));
    setCurrentUser(user);
  }

  function _clear() {
    localStorage.removeItem('chg_token');
    localStorage.removeItem('chg_user');
    setCurrentUser(null);
  }

  // ── Email / password register ──────────────────────────────────────────────
  async function signup(email, password, displayName, role = 'citizen', ward_name = null) {
    const res = await api.post('/api/auth/register', { email, password, displayName, role, ward_name });
    _persist(res.data.token, res.data.user);
    return res.data;
  }

  // ── Email / password login ─────────────────────────────────────────────────
  async function login(email, password) {
    const res = await api.post('/api/auth/login', { email, password });
    _persist(res.data.token, res.data.user);
    return res.data;
  }

  // ── Google OAuth login ─────────────────────────────────────────────────────
  // Called after Google's consent screen returns an ID token
  async function loginWithGoogleToken(googleIdToken) {
    const res = await api.post('/api/auth/google', { id_token: googleIdToken });
    _persist(res.data.token, res.data.user);
    return res.data;
  }

  // ── Logout ─────────────────────────────────────────────────────────────────
  function logout() {
    _clear();
  }

  // ── Compatibility helper (used by pages that call getIdToken) ─────────────
  function getIdToken() {
    return Promise.resolve(localStorage.getItem('chg_token'));
  }

  // ── Refresh user profile from backend ────────────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const res = await api.get('/api/auth/me');
      localStorage.setItem('chg_user', JSON.stringify(res.data));
      setCurrentUser(res.data);
    } catch {}
  }, []);

  const value = {
    currentUser,
    loading,
    signup,
    login,
    loginWithGoogleToken,
    logout,
    getIdToken,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
