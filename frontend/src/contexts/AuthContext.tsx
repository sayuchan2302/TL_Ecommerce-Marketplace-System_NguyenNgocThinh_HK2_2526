/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authService } from '../services/authService';
import type { AuthResponse, User } from '../types';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  refreshSession: (next: AuthResponse) => void;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: (reason?: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const requiresBackendRole = (role?: User['role']) => role === 'VENDOR' || role === 'SUPER_ADMIN';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthResponse | null>(() => authService.getSession() || authService.getAdminSession());

  useEffect(() => {
    const init = async () => {
      const stored = authService.getSession() || authService.getAdminSession();
      if (!stored) {
        setSession(null);
        return;
      }

      const needsBackend = requiresBackendRole(stored.user?.role);
      const hasValidBackendJwt = authService.isBackendJwtToken(stored.token) && !authService.isJwtExpired(stored.token);

      if (needsBackend && !hasValidBackendJwt) {
        if (authService.getRefreshToken()) {
          try {
            const refreshed = await authService.refresh();
            setSession(refreshed);
            return;
          } catch {
            authService.logout('session-expired');
            authService.adminLogout('session-expired');
            setSession(null);
            return;
          }
        }
        authService.logout('session-expired');
        authService.adminLogout('session-expired');
        setSession(null);
        return;
      }

      setSession(stored);
    };

    void init();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await authService.login(email, password);
    setSession(res);
  };

  const refreshSession = (next: AuthResponse) => {
    setSession(next);
  };

  const register = async (name: string, email: string, password: string) => {
    const res = await authService.register(name, email, password);
    setSession(res);
  };

  const logout = (reason?: string) => {
    authService.logout(reason);
    authService.adminLogout(reason);
    setSession(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user || null,
        token: session?.token || null,
        isAuthenticated: Boolean(session?.token),
        login,
        refreshSession,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
