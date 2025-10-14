'use server';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { firebaseConfig } from './config';

// IMPORTANT: The service account key is sourced from an environment variable.
// This is crucial for security and is automatically handled by Firebase App Hosting.
// Do not hardcode service account credentials.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
  : undefined;

let adminApp: App;

if (!getApps().length) {
  if (serviceAccount) {
    adminApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: firebaseConfig.projectId,
    });
  } else {
    // This error will be thrown if the service account is not available in the environment.
    // In a deployed App Hosting environment, this should be provided automatically.
    // For local development, you must set the FIREBASE_SERVICE_ACCOUNT environment variable.
    throw new Error('Firebase Admin SDK service account credentials not found in environment variables.');
  }
} else {
  adminApp = getApps()[0];
}


export async function getDb() {
  return getFirestore(adminApp);
};
