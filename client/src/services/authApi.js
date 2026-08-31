/**
 * authApi.js — Authentication API service
 *
 * Endpoints:
 *   POST /api/auth/login
 *   POST /api/auth/register
 *   GET  /api/auth/me
 *   POST /api/auth/logout
 */

import { axiosInstance, withFallback } from './api';
import { MOCK_USER } from '../data/mockData';

const IS_DEV = import.meta.env.VITE_APP_ENV !== 'production';

export const authApi = {
  /**
   * login({ email, password })
   * Returns: { token, user } or throws error
   */
  async login({ email, password }) {
    return withFallback(
      async () => {
        const res = await axiosInstance.post('/auth/login', { email, password });
        // Store token if backend returns one
        if (res.data?.token) {
          localStorage.setItem('revivepilot-token', res.data.token);
        }
        return res;
      },
      async () => {
        // Mock fallback: validate against MOCK_USER
        await new Promise(r => setTimeout(r, 600));
        if (email === MOCK_USER.email && password === MOCK_USER.password) {
          return { token: 'mock_jwt_token', user: MOCK_USER, _isMock: true };
        }
        const err = new Error('Invalid email or password.');
        err.response = { status: 401, data: { detail: 'Invalid credentials' } };
        throw err;
      },
      'authApi.login'
    );
  },

  /**
   * register({ businessName, fullName, email, password })
   * Returns: { token, user }
   */
  async register({ businessName, fullName, email, password }) {
    return withFallback(
      async () => {
        const res = await axiosInstance.post('/auth/register', { businessName, fullName, email, password });
        if (res.data?.token) {
          localStorage.setItem('revivepilot-token', res.data.token);
        }
        return res;
      },
      async () => {
        await new Promise(r => setTimeout(r, 800));
        const newUser = {
          id: `usr_${Date.now()}`,
          businessName, fullName, email,
          role: 'merchant',
          avatarInitials: fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
          plan: 'Growth',
        };
        return { token: 'mock_jwt_token', user: newUser, _isMock: true };
      },
      'authApi.register'
    );
  },

  /**
   * getCurrentUser()
   * Returns: user object or null
   */
  async getCurrentUser() {
    return withFallback(
      () => axiosInstance.get('/auth/me'),
      async () => {
        const stored = localStorage.getItem('revivepilot-session');
        if (stored) return JSON.parse(stored).user;
        return null;
      },
      'authApi.getCurrentUser'
    );
  },

  /**
   * logout()
   */
  async logout() {
    try {
      await axiosInstance.post('/auth/logout');
    } catch {
      // Ignore backend logout errors — always clear local state
    } finally {
      localStorage.removeItem('revivepilot-token');
      localStorage.removeItem('revivepilot-session');
    }
  },
};
