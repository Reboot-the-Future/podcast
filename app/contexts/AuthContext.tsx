"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  isAuthenticated: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load token from sessionStorage on mount (per-tab session)
    const storedToken = typeof window !== 'undefined' ? sessionStorage.getItem('admin_token') : null;
    if (storedToken) {
      setTokenState(storedToken);
    }
    setIsLoading(false);
  }, []);

  const setToken = (newToken: string | null) => {
    setTokenState(newToken);
    if (newToken) {
      if (typeof window !== 'undefined') sessionStorage.setItem('admin_token', newToken);
    } else {
      if (typeof window !== 'undefined') sessionStorage.removeItem('admin_token');
    }
  };

  const logout = () => {
    setToken(null);
    window.location.href = '/admin/login';
  };

  if (isLoading) {
    return null; // or a loading spinner
  }

  return (
    <AuthContext.Provider value={{ 
      token, 
      setToken, 
      isAuthenticated: !!token,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}