'use client';
import type { LucideIcon } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

export type Client = {
  id: string;
  contactName: string;
  companyName: string;
  contactEmail: string;
  totalSales: number;
  lastPurchaseDate: Timestamp;
  country: string;
  clientType: 'local' | 'international';
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

export type PaymentStatus = 'Pending' | 'Paid';
export type ExportStatus = 'To-do' | 'In Progress' | 'Completed';

export type Export = {
  id: string;
  clientId: string;
  clientName: string;
  productId: string;
  destinationCountry: string;
  destinationPort: string;
  quantity: number;
  price: number;
  exportDate: Timestamp;
  status: ExportStatus;
  paymentStatus: PaymentStatus;
  invoiceNumber: string;
};

export type SaleStatus = 'To-do' | 'In Progress' | 'Completed';

export type LocalSale = {
  id: string;
  clientId: string;
  clientName: string;
  productId: string;
  quantity: number;
  price: number;
  saleDate: Timestamp;
  status: SaleStatus;
  paymentStatus: PaymentStatus;
  invoiceNumber: string;
};

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
}
