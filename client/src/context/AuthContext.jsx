import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { login as apiLogin, me as apiMe } from '../api/authApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('cc_token'));
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const stored = localStorage.getItem('cc_token');
    if (!stored) { setIsLoading(false); return; }
    try {
      const res = await apiMe();
      setUser(res.data.data.user);
    } catch {
      localStorage.removeItem('cc_token');
      localStorage.removeItem('cc_user');
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadUser(); }, [loadUser]);

  async function login(username, password) {
    const res = await apiLogin({ username, password });
    const { token: tok, user: u } = res.data.data;
    localStorage.setItem('cc_token', tok);
    localStorage.setItem('cc_user', JSON.stringify(u));
    setToken(tok);
    setUser(u);
    return u;
  }

  function logout() {
    localStorage.removeItem('cc_token');
    localStorage.removeItem('cc_user');
    setToken(null);
    setUser(null);
  }

  function markPasswordChanged() {
    setUser(prev => {
      if (!prev) return prev;
      const next = { ...prev, force_password_change: false };
      localStorage.setItem('cc_user', JSON.stringify(next));
      return next;
    });
  }

  const isAdmin = () => user?.role === 'admin';
  const isStaff = () => user?.role === 'staff';
  const isMember = () => user?.role === 'member';
  const isAdminOrStaff = () => ['admin', 'staff'].includes(user?.role);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, markPasswordChanged, isAdmin, isStaff, isMember, isAdminOrStaff }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
