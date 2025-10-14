'use server';

import { getDb } from '@/firebase/server';
import { FinancialTransaction } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';


export async function getTransactionsForDateRange(dateRange: {
  from: Date;
  to: Date;
}): Promise<FinancialTransaction[]> {
  const { from, to } = dateRange;
  to.setHours(23, 59, 59, 999); // Ensure the end of the day is included

  const firestore = getDb();

  const transactionsRef = firestore.collection('financial_transactions');
  const q = transactionsRef
    .where('date', '>=', Timestamp.fromDate(from))
    .where('date', '<=', Timestamp.fromDate(to));

  try {
    const querySnapshot = await q.get();
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      // The data from the Admin SDK returns a Timestamp object that is serializable.
      // The client will need to convert it back to a Date object.
      return {
        id: doc.id,
        ...data
      } as FinancialTransaction;
    });
  } catch (error) {
    console.error("Firestore Error (getTransactionsForDateRange):", error);
    throw new Error('Could not retrieve transactions from the database.');
  }
}
