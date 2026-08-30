import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { MOCK_USER } from '../data/mockData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('revivepilot-session');
    if (stored) {
      try {
        const session = JSON.parse(stored);
        setUser(session.user);
        setIsAuthenticated(true);
      } catch {
        localStorage.removeItem('revivepilot-session');
      }
    }
    setLoading(false);
  }, []);

  /**
   * login() — currently uses mock validation.
   * Later: replace body with `await api.post('/auth/login', { email, password })`
   */
  const login = useCallback(async ({ email, password }) => {
    setLoading(true);
    try {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 900));

      if (
        email === MOCK_USER.email &&
        password === MOCK_USER.password
      ) {
        const session = { user: MOCK_USER };
        localStorage.setItem('revivepilot-session', JSON.stringify(session));
        setUser(MOCK_USER);
        setIsAuthenticated(true);
        return { success: true };
      }

      return { success: false, error: 'Invalid email or password.' };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * register() — currently creates a mock session.
   * Later: replace body with `await api.post('/auth/register', payload)`
   */
  const register = useCallback(async ({ businessName, fullName, email, password }) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newUser = {
        id: `usr_${Date.now()}`,
        businessName,
        fullName,
        email,
        role: 'merchant',
        avatarInitials: fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase(),
      };

      const session = { user: newUser };
      localStorage.setItem('revivepilot-session', JSON.stringify(session));
      setUser(newUser);
      setIsAuthenticated(true);
      return { success: true };
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * logout() — clears session.
   * Later: also call `await api.post('/auth/logout')`
   */
  const logout = useCallback(() => {
    localStorage.removeItem('revivepilot-session');
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
