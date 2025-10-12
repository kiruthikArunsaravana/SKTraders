import type { LucideIcon } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

export type Client = {
  id: string;
  name: string;
  company: string;
  email: string;
  totalSales: number;
  lastPurchaseDate: Timestamp;
  country: string;
};

export type Product = {
  id: 'coco-pith' | 'coir-fiber' | 'husk-chips';
  name: 'Coco Pith' | 'Coir Fiber' | 'Husk Chips';
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  icon?: LucideIcon; // Icon is UI-specific, making it optional
};

export type FinancialTransaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: Timestamp;
  category: string;
};

export type ExportStatus = 'To-do' | 'In Progress' | 'Completed';

export type Export = {
  id: string;
  buyerName: string;
  country: string;
  port: string;
  value: number;
  date: Timestamp;
  status: ExportStatus;
};

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
}
