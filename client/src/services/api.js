import axios from 'axios';

/**
 * Axios instance configured with env-based backend URL.
 *
 * Usage:
 *   import api from '../services/api';
 *   const res = await api.get('/recovery/cases');
 *
 * To add auth headers later:
 *   api.interceptors.request.use(config => {
 *     const token = localStorage.getItem('token');
 *     if (token) config.headers.Authorization = `Bearer ${token}`;
 *     return config;
 *   });
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request interceptor (auth token injection goes here) ──────────────────────
api.interceptors.request.use(
  config => {
    // TODO: inject Bearer token when auth backend is ready
    // const token = localStorage.getItem('revivepilot-token');
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  error => Promise.reject(error)
);

// ── Response interceptor (global error handling) ──────────────────────────────
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // TODO: trigger logout on token expiry
      // window.dispatchEvent(new Event('auth:expired'));
    }
    return Promise.reject(error);
  }
);

export default api;
