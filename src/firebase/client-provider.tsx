'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({
  children,
}: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    const services = initializeFirebase();
    const email = 'admin@example.com';
    const password = 'SecureP@ss123';

    // This logic ensures the admin user exists for the first-time app setup.
    // It runs only once on the client side when the app first loads.
    const ensureAdminUser = async () => {
      try {
        // This will only succeed on the very first load if the user doesn't exist.
        await createUserWithEmailAndPassword(services.auth, email, password);
        console.log("Admin user account created.");
      } catch (error: any) {
        // 'auth/email-already-in-use' is the expected error on all subsequent loads.
        // We can safely ignore it. Other errors might indicate a problem.
        if (error.code !== 'auth/email-already-in-use') {
          console.error("Could not ensure admin user exists:", error);
        }
      }
    };
    
    // Only run this check if it hasn't been run before in this browser session.
    if (typeof window !== 'undefined' && !(window as any).__adminUserChecked) {
      ensureAdminUser();
      (window as any).__adminUserChecked = true;
    }
    
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
