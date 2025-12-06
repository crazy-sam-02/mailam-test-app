import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@/types';
import api, { setToken as apiSetToken, getToken as apiGetToken } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: Omit<User, 'id'> & { password: string }) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Start with user null; hydrate from JWT if present
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Hydrate current user if a JWT is present
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const token = apiGetToken();
        if (!token) {
          if (mounted) setLoading(false);
          return;
        }
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
      const res = await api.apiLogin(email, password);
      if (res?.token && res?.user) {
        apiSetToken(res.token);
        setUser(res.user as User);
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
      const payload = { ...userData } as any;
      let res: any;
      if (payload.role === 'admin') {
        res = await api.apiRegisterAdmin(payload);
      } else {
        res = await api.apiRegisterStudent(payload);
      }
      if (res?.token && res?.user) {
        apiSetToken(res.token);
        setUser(res.user as User);
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const logout = () => {
    apiSetToken(null);
    setUser(null);
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
