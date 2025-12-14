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
  id: 'coco-pith' | 'coir-fiber' | 'husk-chips' | 'coconut' | 'copra';
  name: 'Coco Pith' | 'Coir Fiber' | 'Husk Chips' | 'Coconut' | 'Copra';
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  icon?: LucideIcon; // Icon is UI-specific, making it optional
  modifiedDate?: Timestamp;
};

export type FinancialTransaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: Timestamp;
  category: string;
  clientName?: string;
  quantity?: number;
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
  date: Timestamp;
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
  date: Timestamp;
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

export type CoconutPurchase = {
    id: string;
    clientId: string;
    clientName: string;
    quantity: number;
    price: number;
    date: Timestamp;
    paymentStatus: PaymentStatus;
}
