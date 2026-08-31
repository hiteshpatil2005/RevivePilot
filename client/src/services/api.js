/**
 * api.js — Axios instance + withFallback utility
 *
 * withFallback(apiCall, mockData):
 *   - In development: if backend is unreachable, returns mock data silently
 *   - In production: propagates errors normally
 *
 * Token management:
 *   Token is stored in localStorage under 'revivepilot-token'.
 *   Request interceptor injects it as Bearer header automatically.
 *   Response interceptor handles 401 → dispatches 'auth:expired' event.
 */

import axios from 'axios';

const IS_DEV = import.meta.env.VITE_APP_ENV !== 'production';
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 12000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // support httpOnly cookie auth if backend uses it
});

// ── Request interceptor: inject auth token ───────────────────────────────────
axiosInstance.interceptors.request.use(
  config => {
    const token = localStorage.getItem('revivepilot-token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// ── Response interceptor: handle 401 ─────────────────────────────────────────
axiosInstance.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('revivepilot-token');
      localStorage.removeItem('revivepilot-session');
      window.dispatchEvent(new CustomEvent('auth:expired'));
    }
    return Promise.reject(error);
  }
);

/**
 * withFallback — wraps an API call with graceful mock fallback.
 *
 * @param {Function} apiCall - async function that returns axios response
 * @param {*} mockData       - data to return if backend is unreachable in dev
 * @param {string} label     - log label (e.g. 'dashboardApi.getMetrics')
 * @returns {Promise<*>}     - resolved data (real or mock)
 */
export async function withFallback(apiCall, mockData, label = 'API') {
  try {
    const res = await apiCall();
    // Backend returned data — return it
    return res.data;
  } catch (err) {
    const isNetworkError =
      err.code === 'ERR_NETWORK' ||
      err.code === 'ECONNREFUSED' ||
      err.code === 'ERR_CONNECTION_REFUSED' ||
      err.message === 'Network Error' ||
      (!err.response && !navigator.onLine);

    if (IS_DEV && isNetworkError) {
      if (typeof mockData === 'function') {
        console.info(`[${label}] Backend unreachable — using mock data`);
        return await mockData();
      }
      console.info(`[${label}] Backend unreachable — using mock data`);
      return mockData;
    }

    // Non-network error (4xx, 5xx) or production mode: propagate
    throw err;
  }
}

/**
 * checkBackendHealth — resolves true if backend is reachable.
 * Used by ApiStatus component.
 */
export async function checkBackendHealth() {
  try {
    await axiosInstance.get('/health', { timeout: 3000 });
    return true;
  } catch {
    return false;
  }
}

export default axiosInstance;
