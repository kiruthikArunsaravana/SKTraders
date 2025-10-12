import type { Product, Transaction, Export } from './types';
import { Box, Wind, Gem } from 'lucide-react';

// This file now primarily holds static definitions or types that might be shared.
// All dynamic data like clients, products, transactions, and exports are now fetched from the database via server actions.

export const initialProducts: Product[] = [
  { id: 'coco-pith', name: 'Coco Pith', quantity: 0, costPrice: 120, sellingPrice: 180, icon: Box },
  { id: 'coir-fiber', name: 'Coir Fiber', quantity: 0, costPrice: 250, sellingPrice: 350, icon: Wind },
  { id: 'husk-chips', name: 'Husk Chips', quantity: 0, costPrice: 180, sellingPrice: 250, icon: Gem },
];
