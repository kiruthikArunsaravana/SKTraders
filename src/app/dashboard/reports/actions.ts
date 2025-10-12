'use server';

import type { FinancialTransaction } from '@/lib/types';
import { getAdminSdks } from '@/firebase/server';
import { Timestamp } from 'firebase-admin/firestore';

export async function getTransactionsForDateRange(dateRange: {
  from: Date;
  to: Date;
}): Promise<FinancialTransaction[]> {
  const { firestore } = getAdminSdks();
  const { from, to } = dateRange;
  to.setHours(23, 59, 59, 999); // Ensure the end of the day is included
  
  const transactionsRef = firestore.collection('financial_transactions');
  const q = transactionsRef
    .where('date', '>=', Timestamp.fromDate(from))
    .where('date', '<=', Timestamp.fromDate(to));

  try {
    const querySnapshot = await q.get();
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as FinancialTransaction[];
  } catch (error) {
    console.error("Firestore Error (getTransactionsForDateRange):", error);
    return [];
  }
}
