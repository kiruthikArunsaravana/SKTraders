'use server';

import { initializeApp, getApps, App, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { FinancialTransaction } from '@/lib/types';

// Initialize Firebase Admin SDK
let app: App;
if (!getApps().length) {
  try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);
      app = initializeApp({
        credential: cert(serviceAccount),
      });
  } catch (e) {
    console.error('Failed to initialize Firebase Admin SDK:', e);
    // Fallback for environments without service account JSON (like local dev with ADC)
    app = initializeApp();
  }
} else {
  app = getApps()[0];
}

const db = getFirestore(app);

export async function getTransactionsForDateRange(dateRange: {
  from: Date;
  to: Date;
}): Promise<FinancialTransaction[]> {
  const { from, to } = dateRange;
  // Ensure the 'to' date includes the entire day
  const toDate = new Date(to);
  toDate.setHours(23, 59, 59, 999);

  const transactionsRef = db.collection('financial_transactions');
  const q = transactionsRef
    .where('date', '>=', Timestamp.fromDate(new Date(from)))
    .where('date', '<=', Timestamp.fromDate(toDate));

  try {
    const querySnapshot = await q.get();
    if (querySnapshot.empty) {
      return [];
    }
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      // The data from the Admin SDK returns a Firestore Timestamp.
      // It needs to be converted for the client. The actions layer returns serializable data.
      return {
        id: doc.id,
        ...data,
        date: data.date, // Keep as Timestamp for now, will be serialized by Next.js
      } as FinancialTransaction;
    });
  } catch (error) {
    console.error("Firestore Error (getTransactionsForDateRange):", error);
    // This generic error is thrown, but the console.error above will have the details.
    throw new Error('Could not retrieve transactions from the database.');
  }
}
