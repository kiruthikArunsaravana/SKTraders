'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { initializeFirebase } from '@/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

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

    // This logic ensures the admin user exists and attempts to sign them in.
    // It's non-blocking, and the actual auth state is managed by the onAuthStateChanged listener.
    const ensureAdminUser = async () => {
      try {
        // Attempt to create the user. This will fail if the user already exists.
        await createUserWithEmailAndPassword(services.auth, email, password);
        console.log("Admin user created and signed in automatically.");
      } catch (error: any) {
        // If the error code is 'auth/email-already-in-use', it means the user exists,
        // which is expected on subsequent loads. We can then proceed to sign in.
        if (error.code === 'auth/email-already-in-use') {
          // Attempt to sign in, but don't block.
          signInWithEmailAndPassword(services.auth, email, password).catch(signInError => {
            // Silently handle potential sign-in errors during this auto-login phase.
            // The user can still log in manually.
             console.info('Auto-login attempt info:', (signInError as any).code);
          });
        } else {
          // For other creation errors, log them for debugging.
          console.error("Could not create admin user during initial setup:", error);
        }
      }
    };

    ensureAdminUser();
    
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
