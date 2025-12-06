import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@/types';
import api from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: Omit<User, 'id'> & { password: string }) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Start with no cached user (do not use localStorage for auth caching)
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Try to hydrate current user from backend (cookie-based session)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.apiMe();
        if (!mounted) return;
        if (res?.user) {
          setUser(res.user as User);
        }
      } catch (e) {
        // Ignore network/CORS errors; user stays null
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      // Perform login to establish cookie session
      await api.apiLogin(email, password);
      // Always hydrate from /auth/me to avoid relying on response body
      const me = await api.apiMe();
      if (me?.user) {
        setUser(me.user as User);
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const register = async (
    userData: Omit<User, 'id'> & { password: string }
  ): Promise<boolean> => {
    try {
      // Note: backend requires a registration private key for student/admin registration.
      // The frontend should collect and pass `privateKey` in userData when calling this.
      const payload = { ...userData } as any;
      let res;
      if (payload.role === 'admin') {
        // call admin registration endpoint
        res = await api.apiRegisterAdmin(payload);
      } else {
        res = await api.apiRegisterStudent(payload);
      }
      // After registration, hydrate via /auth/me if server created a session
      const me = await api.apiMe();
      if (me?.user) {
        setUser(me.user as User);
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const logout = () => {
    api.apiLogout()
      .catch(() => {})
      .finally(() => setUser(null));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Don't crash the app if provider is missing (e.g., during HMR or embedding).
    // Log and return a safe fallback so routes can redirect to /login instead.
    if (typeof console !== 'undefined') {
      console.error('useAuth must be used within AuthProvider');
    }
    return {
      user: null,
      loading: false,
      login: async () => false,
      register: async () => false,
      logout: () => {},
    } as AuthContextType;
  }
  return context;
};
