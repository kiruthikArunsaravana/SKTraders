import { Box, Wind, Mountain, Gem } from 'lucide-react';
import type { Client, Product, Transaction, Export } from './types';
import { placeholderImages } from './placeholder-images.json';
import { format, subDays, startOfMonth } from 'date-fns';

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

const now = new Date();
const currentYear = now.getFullYear();
const currentMonth = now.getMonth();
const startOfCurrentMonth = startOfMonth(now);

export const transactions: Transaction[] = [
  { id: '1', clientName: 'Green Earth Exports', clientAvatarUrl: avatar1, product: 'Coco Pith', amount: 2500, date: subDays(now, 15).toISOString(), type: 'Income' },
  { id: '2', clientName: 'Raw Materials Inc.', clientAvatarUrl: avatar3, product: 'Coco Pith', amount: -800, date: subDays(now, 14).toISOString(), type: 'Expense' },
  { id: '3', clientName: 'Nusantara Gardens', clientAvatarUrl: avatar2, product: 'Coir Fiber', amount: 4200, date: subDays(now, 10).toISOString(), type: 'Income' },
  { id: '4', clientName: 'Machine Maintenance', clientAvatarUrl: avatar4, product: 'Coir Fiber', amount: -1200, date: subDays(now, 8).toISOString(), type: 'Expense' },
  { id: '5', clientName: 'Global Organics LLC', clientAvatarUrl: avatar3, product: 'Husk Chips', amount: 3100, date: subDays(now, 5).toISOString(), type: 'Income' },
  { id: '6', clientName: 'Dragon Soil Inc.', clientAvatarUrl: avatar4, product: 'Coco Pith', amount: 1800, date: subDays(now, 2).toISOString(), type: 'Income' },
  { id: '7', clientName: 'Fuel & Logistics', clientAvatarUrl: avatar1, product: 'Husk Chips', amount: -650, date: subDays(now, 1).toISOString(), type: 'Expense' },
  // Previous month's data for comparison
  { id: '8', clientName: 'Green Earth Exports', clientAvatarUrl: avatar1, product: 'Coir Fiber', amount: 3200, date: subDays(startOfCurrentMonth, 12).toISOString(), type: 'Income' },
  { id: '9', clientName: 'Nusantara Gardens', clientAvatarUrl: avatar2, product: 'Husk Chips', amount: 2800, date: subDays(startOfCurrentMonth, 8).toISOString(), type: 'Income' },
  { id: '10', clientName: 'Old Raw Materials', clientAvatarUrl: avatar3, product: 'Coco Pith', amount: -950, date: subDays(startOfCurrentMonth, 5).toISOString(), type: 'Expense' },
];


export const exports: Export[] = [
    { id: '1', buyerName: 'Euro Garden Supplies', country: 'Germany', port: 'Hamburg', value: 45000, date: new Date(currentYear, now.getMonth() - 1, 5).toISOString() },
    { id: '2', buyerName: 'Agro World Japan', country: 'Japan', port: 'Tokyo', value: 62000, date: new Date(currentYear, now.getMonth() - 1, 18).toISOString() },
    { id: '3', buyerName: 'Canadian Horti Inc.', country: 'Canada', port: 'Vancouver', value: 38000, date: new Date(currentYear, now.getMonth(), 1).toISOString() },
    { id: '4', buyerName: 'AusGrow Solutions', country: 'Australia', port: 'Sydney', value: 51000, date: new Date(currentYear, now.getMonth(), 12).toISOString() },
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
