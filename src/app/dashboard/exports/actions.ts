'use server';

import type { Export } from '@/lib/types';
import { z } from 'zod';
import { getAdminSdks } from '@/firebase/server';
import { Timestamp } from 'firebase-admin/firestore';

const exportSchema = z.object({
  buyerName: z.string().min(1, 'Buyer name is required'),
  country: z.string().min(1, 'Country is required'),
  port: z.string().min(1, 'Port is required'),
  value: z.coerce.number().positive('Value must be a positive number'),
});

export async function addExportAction(formData: FormData) {
  const { firestore } = getAdminSdks();
  const rawData = Object.fromEntries(formData.entries());

  const validation = exportSchema.safeParse(rawData);
  if (!validation.success) {
    return { success: false, error: validation.error.flatten().fieldErrors };
  }

  const { buyerName, country, port, value } = validation.data;
  const newExportData = {
    buyerName,
    country,
    port,
    value,
    date: Timestamp.now(),
  };

  try {
    const exportsCollection = firestore.collection('exports');
    const docRef = await exportsCollection.add(newExportData);

    const newExport: Export = { id: docRef.id, ...newExportData };

    console.log(`Export added with ID: ${docRef.id}`);
    return { success: true, newExport };
  } catch (error) {
    console.error('Firestore Error (addExportAction):', error);
    return {
      success: false,
      error: 'Failed to save export order to the database.',
    };
  }
}
