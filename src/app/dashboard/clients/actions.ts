'use server';

import { addDoc, collection } from 'firebase/firestore';
import { z } from 'zod';
import { getSdks } from '@/firebase';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import type { Client } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

// Schema for validating form data
const clientSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  company: z.string().min(1, 'Company is required'),
  country: z.string().min(1, 'Country is required'),
});

/**
 * This function runs on the server and saves a new client to Firestore.
 */
export async function addClientAction(formData: FormData) {
  const { firestore } = getSdks();
  const rawData = Object.fromEntries(formData.entries());

  // 1. Validate data on the server
  const validation = clientSchema.safeParse(rawData);
  if (!validation.success) {
    return { success: false, error: validation.error.flatten().fieldErrors };
  }

  const { name, email, company, country } = validation.data;

  const newClientData = {
    name,
    email,
    company,
    country,
    totalSales: 0,
    lastPurchaseDate: Timestamp.now(),
  };

  try {
    const clientsCollection = collection(firestore, 'clients');
    // Using await here because we want to return the new client to the caller
    const docRef = await addDoc(clientsCollection, newClientData);

    const newClient: Client = { id: docRef.id, ...newClientData };
    console.log(`Client added with ID: ${docRef.id}`);
    return { success: true, newClient };
  } catch (error) {
    console.error('Firestore Error (addClientAction):', error);
    // In a real app, you might want to use the error emitter for permission errors
    // but for a general failure, returning an error message is fine.
    const permissionError = new FirestorePermissionError({
      path: 'clients',
      operation: 'create',
      requestResourceData: newClientData,
    });
    errorEmitter.emit('permission-error', permissionError);
    return {
      success: false,
      error: 'Failed to save client to the database.',
    };
  }
}
