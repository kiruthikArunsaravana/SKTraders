import type { LucideIcon } from 'lucide-react';

export type Client = {
  id: string;
  name: string;
  company: string;
  email: string;
  totalSales: number;
  lastPurchaseDate: string;
  country: string;
};

export type Product = {
  id: 'coco-pith' | 'coir-fiber' | 'husk-chips';
  name: 'Coco Pith' | 'Coir Fiber' | 'Husk Chips';
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  icon: LucideIcon;
};

export type Transaction = {
  id: string;
  clientName: string;
  clientAvatarUrl: string;
  product: 'Coco Pith' | 'Coir Fiber' | 'Husk Chips';
  amount: number;
  date: string;
  type: 'Income' | 'Expense';
};

export type Export = {
  id: string;
  buyerName: string;
  country: string;
  port: string;
  value: number;
  date: string;
};

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
}
