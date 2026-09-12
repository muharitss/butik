import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { setOnUnauthorizedCallback } from '../lib/apiClient.ts';
import { authApi } from '../features/auth/api/auth.api.ts';
import type { LoginInput, User } from '../features/auth/types/auth.types.ts';

export interface AuthContextValue {
  currentUser: User | null;
  loading: boolean;
  login: (credentials: LoginInput) => Promise<User>;
  logout: () => Promise<void>;
  setCurrentUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Register 401 interceptor callback
  useEffect(() => {
    setOnUnauthorizedCallback(() => {
      setCurrentUser(null);
    });

    return () => {
      setOnUnauthorizedCallback(null);
    };
  }, []);

  // Restore session on mount via GET /api/auth/me
  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const user = await authApi.getMe();
        if (mounted) {
          setCurrentUser(user);
        }
      } catch {
        if (mounted) {
          setCurrentUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (credentials: LoginInput): Promise<User> => {
    const user = await authApi.login(credentials);
    setCurrentUser(user);
    return user;
  };

  const logout = async (): Promise<void> => {
    try {
      await authApi.logout();
    } finally {
      setCurrentUser(null);
    }
  };

  const value: AuthContextValue = {
    currentUser,
    loading,
    login,
    logout,
    setCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
