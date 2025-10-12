import { Box, Wind, Mountain, Gem } from 'lucide-react';
import type { Client, Product, Transaction, Export } from './types';
import { placeholderImages } from './placeholder-images.json';
import { format, subDays, startOfMonth } from 'date-fns';

export const clients: Client[] = [];

export const products: Product[] = [
  { id: 'coco-pith', name: 'Coco Pith', quantity: 0, costPrice: 120, sellingPrice: 180, icon: Box },
  { id: 'coir-fiber', name: 'Coir Fiber', quantity: 0, costPrice: 250, sellingPrice: 350, icon: Wind },
  { id: 'husk-chips', name: 'Husk Chips', quantity: 0, costPrice: 180, sellingPrice: 250, icon: Gem },
];

const avatar1 = placeholderImages.find(p => p.id === 'avatar-1')?.imageUrl ?? '';
const avatar2 = placeholderImages.find(p => p.id === 'avatar-2')?.imageUrl ?? '';
const avatar3 = placeholderImages.find(p => p.id === 'avatar-3')?.imageUrl ?? '';
const avatar4 = placeholderImages.find(p => p.id === 'avatar-4')?.imageUrl ?? '';

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth();
const startOfCurrentMonth = startOfMonth(now);

export const transactions: Transaction[] = [];


export const exports: Export[] = [];

export const salesByMonth = [
    { month: 'Jan', sales: 0, expenses: 0 },
    { month: 'Feb', sales: 0, expenses: 0 },
    { month: 'Mar', sales: 0, expenses: 0 },
    { month: 'Apr', sales: 0, expenses: 0 },
    { month: 'May', sales: 0, expenses: 0 },
    { month: 'Jun', sales: 0, expenses: 0 },
    { month: 'Jul', sales: 0, expenses: 0 },
    { month: 'Aug', sales: 0, expenses: 0 },
    { month: 'Sep', sales: 0, expenses: 0 },
    { month: 'Oct', sales: 0, expenses: 0 },
    { month: 'Nov', sales: 0, expenses: 0 },
    { month: 'Dec', sales: 0, expenses: 0 },
];
