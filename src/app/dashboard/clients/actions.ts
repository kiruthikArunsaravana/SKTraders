'use server';

import { z } from 'zod';
import { getAdminSdks } from '@/firebase/server';
import type { Client } from '@/lib/types';
import { Timestamp } from 'firebase-admin/firestore';

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
  const { firestore } = getAdminSdks();
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
    const clientsCollection = firestore.collection('clients');
    const docRef = await clientsCollection.add(newClientData);

    const newClient: Client = { id: docRef.id, ...newClientData };
    console.log(`Client added with ID: ${docRef.id}`);
    return { success: true, newClient };
  } catch (error) {
    console.error('Firestore Error (addClientAction):', error);
    return {
      success: false,
      error: 'Failed to save client to the database.',
    };
  }
}
