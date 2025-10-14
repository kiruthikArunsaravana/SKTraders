'use server';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { firebaseConfig } from './config';

let app: App;

if (!getApps().length) {
    // Initialize without credentials, relying on Application Default Credentials
    // in the server environment.
    app = initializeApp({
        projectId: firebaseConfig.projectId,
    });
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

export { db, Timestamp };
