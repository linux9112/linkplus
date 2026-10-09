import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, Profile, AuthContextType } from '../types/index';
import { api } from '../api/client';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await api.get<{ user: User; profile: Profile | null }>('/api/auth/me');
      if (response && response.user) {
        setUser(response.user);
        setProfile(response.profile || null);
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch {
      // 401 unauthenticated is expected when not logged in
      setUser(null);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (identifier: string, password: string) => {
    const res = await api.post<{ user: User; message: string }>('/api/auth/login', {
      identifier,
      password,
    });
    if (res && res.user) {
      setUser(res.user);
      // Fetch full profile info
      await refreshUser();
    }
  };

  const signup = async (username: string, email: string, password: string) => {
    // Strictly 3 fields submitted
    const res = await api.post<{ user: User; message: string }>('/api/auth/signup', {
      username,
      email,
      password,
    });
    if (res && res.user) {
      setUser(res.user);
      await refreshUser();
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } finally {
      setUser(null);
      setProfile(null);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    isLoading,
    isAuthenticated: Boolean(user),
    login,
    signup,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
