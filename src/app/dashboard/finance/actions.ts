'use server';

import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { z } from 'zod';
import { getSdks } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { FinancialTransaction } from '@/lib/types';

const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive('Amount must be a positive number'),
  description: z.string().min(1, 'Description is required'),
  category: z.string().min(1, 'Category/Product is required'),
  date: z.string().min(1, 'Date is required'),
});

export async function addTransactionAction(formData: FormData) {
  const { firestore } = getSdks();
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
    const transactionsCollection = collection(firestore, 'financial_transactions');
    // Using await to return success, but errors are handled by the emitter
    const docRef = await addDoc(transactionsCollection, newTransactionData);

    const newTransaction: FinancialTransaction = {
      id: docRef.id,
      ...newTransactionData,
    };

    return { success: true, newTransaction };
  } catch (error) {
    console.error('Firestore Error (addTransactionAction):', error);
    const permissionError = new FirestorePermissionError({
      path: 'financial_transactions',
      operation: 'create',
      requestResourceData: newTransactionData,
    });
    errorEmitter.emit('permission-error', permissionError);
    return {
      success: false,
      error: 'Failed to save transaction to the database.',
    };
  }
}
