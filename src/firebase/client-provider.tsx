'use client';

import React, { type ReactNode } from 'react';
import { AuthProvider } from '@/firebase/provider';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}
