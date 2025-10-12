'use server';

import { z } from 'zod';
import { getAdminSdks } from '@/firebase/server';
import type { Product } from '@/lib/types';
import { initialProducts } from '@/lib/data';

const stockSchema = z.object({
  product: z.enum(['coco-pith', 'coir-fiber', 'husk-chips']),
  quantity: z.coerce.number().int('Quantity must be a whole number'),
});

async function initializeProducts(): Promise<void> {
  const { firestore } = getAdminSdks();
  const productsCollection = firestore.collection('products');

  try {
    await firestore.runTransaction(async (transaction) => {
      for (const product of initialProducts) {
        const productRef = productsCollection.doc(product.id);
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists) {
          // Exclude icon when writing to Firestore
          const { icon, ...dbProduct } = product;
          transaction.set(productRef, dbProduct);
        }
      }
    });
    console.log('Products initialized successfully.');
  } catch (error) {
    console.error('Error initializing products:', error);
  }
}

export async function getProductsAction(): Promise<Omit<Product, 'icon'>[]> {
  const { firestore } = getAdminSdks();
  const productsCollection = firestore.collection('products');
  
  try {
    let querySnapshot = await productsCollection.get();

    // If the collection is empty, initialize it
    if (querySnapshot.empty) {
      console.log('Products collection is empty, initializing...');
      await initializeProducts();
      querySnapshot = await productsCollection.get(); // Re-fetch after initializing
    }

    const products = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Omit<Product, 'icon'>[];

    return products;
  } catch (error) {
    console.error('Firestore Error (getProductsAction):', error);
    return [];
  }
}


export async function updateStockAction(formData: FormData) {
  const { firestore } = getAdminSdks();
  const rawData = Object.fromEntries(formData.entries());

  const validation = stockSchema.safeParse(rawData);
  if (!validation.success) {
    return { success: false, error: validation.error.flatten().fieldErrors };
  }

  const { product: productId, quantity } = validation.data;
  const productRef = firestore.collection('products').doc(productId);

  try {
    const updatedProductData = await firestore.runTransaction(async (transaction) => {
        const productDoc = await transaction.get(productRef);
        if (!productDoc.exists) {
            throw "Document does not exist!";
        }
        const newQuantity = (productDoc.data()?.quantity || 0) + quantity;
        transaction.update(productRef, { quantity: newQuantity });
        return { ...productDoc.data(), quantity: newQuantity, id: productDoc.id };
    });

    return { success: true, updatedProduct: updatedProductData as Product };

  } catch (error) {
    console.error('Firestore Error (updateStockAction):', error);
    return { success: false, error: 'Failed to update stock in the database.' };
  }
}
