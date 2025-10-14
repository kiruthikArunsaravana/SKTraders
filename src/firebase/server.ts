'use server';
import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { firebaseConfig } from './config';

let app: App;

if (!getApps().length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
    : undefined;

  if (serviceAccount) {
    app = initializeApp({
      credential: cert(serviceAccount),
      projectId: firebaseConfig.projectId,
    });
  } else {
    // This will likely fail in production if not configured, but allows local dev without service account
    app = initializeApp({
        projectId: firebaseConfig.projectId,
    });
  }
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

export { db, Timestamp };
