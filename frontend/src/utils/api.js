/**
 * api.js — Community Hero Green
 * Centralised axios instance.
 * Attaches JWT from localStorage to every request automatically.
 * Zero Firebase dependency.
 */

import axios from 'axios';

const BACKEND = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001';

const api = axios.create({ baseURL: BACKEND });

// Attach token from localStorage on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('chg_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear token and reload to force re-login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('chg_token');
      localStorage.removeItem('chg_user');
      window.location.href = '/auth';
    }
    return Promise.reject(err);
  }
);

export default api;
