
'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// IMPORTANT: DO NOT MODIFY THIS FILE
// This file is the single source of truth for initializing Firebase services.

let firebaseApp: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

if (getApps().length > 0) {
  firebaseApp = getApp();
} else {
  firebaseApp = initializeApp(firebaseConfig);
}

auth = getAuth(firebaseApp);
firestore = getFirestore(firebaseApp);

export { firebaseApp, auth, firestore };
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
