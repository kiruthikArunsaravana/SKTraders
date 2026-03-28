'use client';

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback } from 'react';

interface AuthProviderProps {
  children: ReactNode;
}

interface UserAuthState {
  user: any | null;
  isUserLoading: boolean;
  userError: Error | null;
}

export interface AuthContextState {
  user: any | null;
  isUserLoading: boolean;
  userError: Error | null;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextState | undefined>(undefined);
const FIRESTORE_SHIM = Object.freeze({});

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [userAuthState, setUserAuthState] = useState<UserAuthState>({ user: null, isUserLoading: true, userError: null });

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include', cache: 'no-store' });
      if (!res.ok) throw new Error('Not authenticated');
      const json = await res.json();
      setUserAuthState({ user: json.user, isUserLoading: false, userError: null });
    } catch (_err: any) {
      setUserAuthState({ user: null, isUserLoading: false, userError: null });
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      setUserAuthState({ user: null, isUserLoading: false, userError: null });
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const contextValue = useMemo((): AuthContextState => ({
    user: userAuthState.user,
    isUserLoading: userAuthState.isUserLoading,
    userError: userAuthState.userError,
    logout,
    refreshUser,
  }), [userAuthState, logout, refreshUser]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within AuthProvider.');
  return context;
};

export const useUser = () => {
  const { user, isUserLoading, userError } = useAuth();
  return { user, isUserLoading, userError };
};

export const useFirestore = () => {
  // Deprecated: useFirestore is no longer needed. Use fetch() or custom hooks instead.
  return FIRESTORE_SHIM;
};

export const useFirebase = () => {
  const auth = useAuth();
  return auth;
};

export const useMemoFirebase = <T,>(
  factory: () => T,
  deps: React.DependencyList,
): T => {
  return useMemo(() => {
    const value = factory();
    if (value && typeof value === 'object') {
      (value as T & { __memo?: boolean }).__memo = true;
    }
    return value;
  }, deps);
};
