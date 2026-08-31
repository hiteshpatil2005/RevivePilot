import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Restore session from token or localStorage on mount
  useEffect(() => {
    async function restoreSession() {
      try {
        const stored = localStorage.getItem('revivepilot-session');
        const token = localStorage.getItem('revivepilot-token');

        if (token || stored) {
          // Attempt backend verification
          const currentUser = await authApi.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            setIsAuthenticated(true);
          } else if (stored) {
            const session = JSON.parse(stored);
            setUser(session.user);
            setIsAuthenticated(true);
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Session restore fallback:', err);
        localStorage.removeItem('revivepilot-session');
        localStorage.removeItem('revivepilot-token');
      } finally {
        setLoading(false);
      }
    }

    restoreSession();

    // Listen for auth expiration events dispatched by axios interceptor
    const handleAuthExpired = () => {
      setUser(null);
      setIsAuthenticated(false);
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  /**
   * login({ email, password }) — calls authApi.login
   */
  const login = useCallback(async ({ email, password }) => {
    setLoading(true);
    try {
      const data = await authApi.login({ email, password });
      if (data?.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        localStorage.setItem('revivepilot-session', JSON.stringify({ user: data.user }));
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (err) {
      console.error('[AuthContext] Login error:', err);
      return {
        success: false,
        error: err.response?.data?.detail || err.message || 'Invalid email or password.',
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * register(...) — calls authApi.register
   */
  const register = useCallback(async ({ businessName, fullName, email, password }) => {
    setLoading(true);
    try {
      const data = await authApi.register({ businessName, fullName, email, password });
      if (data?.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        localStorage.setItem('revivepilot-session', JSON.stringify({ user: data.user }));
        return { success: true };
      }
      return { success: false, error: 'Registration failed' };
    } catch (err) {
      console.error('[AuthContext] Registration error:', err);
      return {
        success: false,
        error: err.response?.data?.detail || err.message || 'Registration failed.',
      };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * logout() — calls authApi.logout and clears state
   */
  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
