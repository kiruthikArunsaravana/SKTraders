
'use client';

import { firebaseConfig as devFirebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore'

// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  if (getApps().length) {
    return getSdks(getApp());
  }

  // In a Firebase App Hosting env, the following env vars should be available.
  // https://firebase.google.com/docs/app-hosting/automatic-build-and-deploy#node.js
  const prodFirebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const firebaseConfig = process.env.NODE_ENV === 'production' && prodFirebaseConfig.projectId
    ? prodFirebaseConfig
    : devFirebaseConfig;

  // Important! initializeApp() is called without any arguments because Firebase App Hosting
  // integrates with the initializeApp() function to provide the environment variables needed to
  // populate the FirebaseOptions in production. It is critical that we attempt to call initializeApp()
  // without arguments.
  let firebaseApp;
  try {
    // Attempt to initialize via Firebase App Hosting environment variables
    firebaseApp = initializeApp();
  } catch (e) {
    // Only warn in production because it's normal to use the firebaseConfig to initialize
    // during development
    if (process.env.NODE_ENV === "production") {
      console.warn('Automatic initialization failed. Falling back to firebase config object.', e);
    }
    firebaseApp = initializeApp(firebaseConfig);
  }

  return getSdks(firebaseApp);
}

export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './errors';
export * from './error-emitter';

