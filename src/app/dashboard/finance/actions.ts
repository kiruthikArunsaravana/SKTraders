'use server';

import { z } from 'zod';
import { getAdminSdks } from '@/firebase/server';
import type { FinancialTransaction } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';


const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive('Amount must be a positive number'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category/Product is required'),
  date: z.string().min(1, 'Date is required'),
});

export async function addTransactionAction(formData: FormData) {
  const { firestore } = getAdminSdks();
  const rawData = {
    type: formData.get('type'),
    amount: formData.get('amount'),
    description: formData.get('description'),
    category: formData.get('category') || formData.get('product'),
    date: formData.get('date'),
  };

  const validation = transactionSchema.safeParse(rawData);
  if (!validation.success) {
    console.error('Validation failed', validation.error.flatten().fieldErrors);
    return { success: false, error: validation.error.flatten().fieldErrors };
  }

  const { type, amount, description, category, date } = validation.data;

  const finalAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
  
  const newTransactionData = {
    type,
    amount: finalAmount,
    description,
    category,
    date: Timestamp.fromDate(new Date(date)),
  };

  try {
    const transactionsCollection = firestore.collection('financial_transactions');
    const docRef = await transactionsCollection.add(newTransactionData);

    const newTransaction: FinancialTransaction = {
      id: docRef.id,
      ...newTransactionData,
    };

    return { success: true, newTransaction };
  } catch (error) {
    console.error('Firestore Error (addTransactionAction):', error);
    return {
      success: false,
      error: 'Failed to save transaction to the database.',
    };
  }
}
