import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// IMPORTANT: DO NOT MODIFY THIS FILE
// This file is used to initialize the Firebase Admin SDK on the server side.
// It is essential for server actions that need to interact with Firebase services.

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : {};

export function getAdminSdks() {
  const appName = 'firebase-admin-app-for-studio';
  // Check if the app is already initialized
  const existingApp = getApps().find(app => app.name === appName);

  if (existingApp) {
    return {
      firestore: getFirestore(existingApp),
    };
  }

  // Initialize the app if it doesn't exist
  const newApp = initializeApp({
    credential: cert(serviceAccount),
  }, appName);

  return {
    firestore: getFirestore(newApp),
  };
}
