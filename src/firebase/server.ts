'use server';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { firebaseConfig } from './config';

// IMPORTANT: The service account key is sourced from an environment variable.
// This is crucial for security and is automatically handled by Firebase App Hosting.
// Do not hardcode service account credentials.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : undefined;

const getApp = (): App => {
  if (getApps().length) {
    return getApps()[0];
  }

  // Conditionally use credentials only if the service account is available.
  // In some environments (like local development without the env var),
  // the SDK can initialize without explicit credentials.
  if (serviceAccount) {
    return initializeApp({
      credential: cert(serviceAccount),
      projectId: firebaseConfig.projectId,
    });
  }
  
  // When running locally, you must provide a service account via the
  // FIREBASE_SERVICE_ACCOUNT environment variable.
  // In a deployed environment (like App Hosting), this is provided automatically.
  throw new Error('Firebase Admin SDK service account credentials not found in environment variables.');
};

export const getDb = async () => {
  return getFirestore(getApp());
};
