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

  return initializeApp({
    credential: cert(serviceAccount),
    projectId: firebaseConfig.projectId,
  });
};

export const getDb = () => {
  return getFirestore(getApp());
};
