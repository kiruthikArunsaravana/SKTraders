'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({
  children,
}: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    const services = initializeFirebase();
    // Non-blocking sign-in attempt for the default admin user.
    // This allows the app to automatically log in if the credentials are correct,
    // without blocking the UI rendering. The actual auth state is managed by the onAuthStateChanged listener.
    signInWithEmailAndPassword(
      services.auth,
      'admin@example.com',
      'password'
    ).catch((error) => {
      // We can silently ignore errors here, as the user will be prompted to log in manually.
      // This is just an attempt for a smoother UX.
      if (error.code !== 'auth/invalid-credential' && error.code !== 'auth/user-not-found') {
          console.info('Auto-login attempt info:', error.code);
      }
    });
    return services;
  }, []);

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
