import { Box, Wind, Mountain, Gem } from 'lucide-react';
import type { Client, Product, Transaction, Export } from './types';
import { placeholderImages } from './placeholder-images.json';

export const clients: Client[] = [
  { id: '1', name: 'Ramesh Kumar', company: 'Green Earth Exports', email: 'ramesh@greenearth.com', totalSales: 75000, lastPurchaseDate: '2023-10-15', country: 'India' },
  { id: '2', name: 'Siti Aisyah', company: 'Nusantara Gardens', email: 'siti@nusantara.co.id', totalSales: 120000, lastPurchaseDate: '2023-11-02', country: 'Indonesia' },
  { id: '3', name: 'John Smith', company: 'Global Organics LLC', email: 'john.s@globalorganics.com', totalSales: 210000, lastPurchaseDate: '2023-10-28', country: 'USA' },
  { id: '4', name: 'Wei Chen', company: 'Dragon Soil Inc.', email: 'w.chen@dragonsoil.cn', totalSales: 95000, lastPurchaseDate: '2023-11-10', country: 'China' },
];

export const products: Product[] = [
  { id: 'coco-pith', name: 'Coco Pith', quantity: 1500, costPrice: 120, sellingPrice: 180, icon: Box },
  { id: 'coir-fiber', name: 'Coir Fiber', quantity: 800, costPrice: 250, sellingPrice: 350, icon: Wind },
  { id: 'husk-chips', name: 'Husk Chips', quantity: 1200, costPrice: 180, sellingPrice: 250, icon: Gem },
];

const avatar1 = placeholderImages.find(p => p.id === 'avatar-1')?.imageUrl ?? '';
const avatar2 = placeholderImages.find(p => p.id === 'avatar-2')?.imageUrl ?? '';
const avatar3 = placeholderImages.find(p => p.id === 'avatar-3')?.imageUrl ?? '';
const avatar4 = placeholderImages.find(p => p.id === 'avatar-4')?.imageUrl ?? '';

export const transactions: Transaction[] = [
  { id: '1', clientName: 'Ramesh Kumar', clientAvatarUrl: avatar1, product: 'Coco Pith', amount: 4500, date: '2023-11-20', type: 'Income' },
  { id: '2', clientName: 'Raw Husk Supplier', clientAvatarUrl: avatar2, product: 'Husk Chips', amount: -12000, date: '2023-11-19', type: 'Expense' },
  { id: '3', clientName: 'John Smith', clientAvatarUrl: avatar3, product: 'Coir Fiber', amount: 8750, date: '2023-11-18', type: 'Income' },
  { id: '4', clientName: 'Siti Aisyah', clientAvatarUrl: avatar2, product: 'Coco Pith', amount: 6300, date: '2023-11-17', type: 'Income' },
  { id: '5', clientName: 'Operational Costs', clientAvatarUrl: avatar4, product: 'Husk Chips', amount: -3500, date: '2023-11-16', type: 'Expense' },
];

export const exports: Export[] = [
    { id: '1', buyerName: 'Euro Garden Supplies', country: 'Germany', port: 'Hamburg', value: 45000, date: '2023-10-05' },
    { id: '2', buyerName: 'Agro World Japan', country: 'Japan', port: 'Tokyo', value: 62000, date: '2023-10-18' },
    { id: '3', buyerName: 'Canadian Horti Inc.', country: 'Canada', port: 'Vancouver', value: 38000, date: '2023-11-01' },
    { id: '4', buyerName: 'AusGrow Solutions', country: 'Australia', port: 'Sydney', value: 51000, date: '2023-11-12' },
];

export const salesByMonth = [
    { month: 'Jan', sales: 120000, expenses: 80000 },
    { month: 'Feb', sales: 150000, expenses: 90000 },
    { month: 'Mar', sales: 175000, expenses: 100000 },
    { month: 'Apr', sales: 160000, expenses: 95000 },
    { month: 'May', sales: 190000, expenses: 110000 },
    { month: 'Jun', sales: 210000, expenses: 120000 },
    { month: 'Jul', sales: 230000, expenses: 130000 },
    { month: 'Aug', sales: 220000, expenses: 125000 },
    { month: 'Sep', sales: 250000, expenses: 140000 },
    { month: 'Oct', sales: 280000, expenses: 150000 },
    { month: 'Nov', sales: 260000, expenses: 145000 },
    { month: 'Dec', sales: 300000, expenses: 160000 },
];
