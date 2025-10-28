import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@/types';
import api from '@/lib/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: Omit<User, 'id'> & { password: string }) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Hydrate from localStorage immediately to avoid redirect flicker on refresh
  const [user, setUser] = useState<User | null>(() => {
    try {
      const raw = localStorage.getItem('auth_user');
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  });

  const persistUser = (u: User | null) => {
    try {
      if (u) localStorage.setItem('auth_user', JSON.stringify(u));
      else localStorage.removeItem('auth_user');
    } catch {}
  };

  // Try to hydrate current user from backend (cookie-based session)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.apiMe();
        if (!mounted) return;
        if (res?.user) {
          setUser(res.user as User);
          persistUser(res.user as User);
        }
        // If res.user is null, keep whatever was in localStorage to honor the user's request
      } catch (e) {
        // Ignore network/CORS errors and keep localStorage session for UI continuity
      }
    })();
    return () => { mounted = false; };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await api.apiLogin(email, password);
      if (res?.user) {
        setUser(res.user as User);
        persistUser(res.user as User);
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
      if (res?.user) {
        setUser(res.user as User);
        persistUser(res.user as User);
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    persistUser(null);
    api.apiLogout().catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
