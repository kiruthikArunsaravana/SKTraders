'use server';

import { initializeFirebase } from '@/firebase';
import { FinancialTransaction } from '@/lib/types';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';

export async function getTransactionsForDateRange(dateRange: {
  from: Date;
  to: Date;
}): Promise<FinancialTransaction[]> {
  const { from, to } = dateRange;
  to.setHours(23, 59, 59, 999); // Ensure the end of the day is included

  const { firestore } = initializeFirebase();

  const transactionsRef = collection(firestore, 'financial_transactions');
  const q = query(
    transactionsRef,
    where('date', '>=', Timestamp.fromDate(from)),
    where('date', '<=', Timestamp.fromDate(to))
  );

  try {
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date, // Keep as Timestamp for now
      } as FinancialTransaction;
    });
  } catch (error) {
    console.error("Firestore Error (getTransactionsForDateRange):", error);
    // In a real app, you might want to throw a more specific error
    // or handle it in a way that the client can understand.
    throw new Error('Could not retrieve transactions from the database.');
  }
}
