'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, TrendingUp, Package, Ship } from 'lucide-react';
import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { FinancialTransaction, Product, Export } from '@/lib/types';
import { initialProducts } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { startOfMonth, endOfMonth } from 'date-fns';

export default function DashboardCards() {
  const firestore = useFirestore();

  const thisMonthRange = useMemo(() => {
    const now = new Date();
    return {
      start: startOfMonth(now),
      end: endOfMonth(now),
    };
  }, []);

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'financial_transactions'),
      where('date', '>=', Timestamp.fromDate(thisMonthRange.start)),
      where('date', '<=', Timestamp.fromDate(thisMonthRange.end))
    );
  }, [firestore, thisMonthRange]);

  const { data: transactions, isLoading: isTransactionsLoading } = useCollection<FinancialTransaction>(transactionsQuery);

  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // This query is simplified, a real "top product" might need more complex aggregation
    return query(collection(firestore, 'products'), orderBy('quantity', 'desc'), limit(1));
  }, [firestore]);

  const { data: topProducts, isLoading: isProductsLoading } = useCollection<Omit<Product, 'id' | 'icon'>>(productsQuery);
  
  const exportsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
        collection(firestore, 'exports'),
        where('exportDate', '>=', Timestamp.fromDate(thisMonthRange.start)),
        where('exportDate', '<=', Timestamp.fromDate(thisMonthRange.end))
    );
  }, [firestore, thisMonthRange]);
  
  const { data: exports, isLoading: isExportsLoading } = useCollection<Export>(exportsQuery);

  const { totalRevenue, totalExpenses } = useMemo(() => {
    if (!transactions) return { totalRevenue: 0, totalExpenses: 0 };
    return transactions.reduce((acc, t) => {
      if (t.type === 'income') {
        acc.totalRevenue += t.amount;
      } else {
        acc.totalExpenses += Math.abs(t.amount);
      }
      return acc;
    }, { totalRevenue: 0, totalExpenses: 0 });
  }, [transactions]);
  
  const topProduct = useMemo(() => {
      if(topProducts && topProducts.length > 0) {
          const top = topProducts[0];
          const staticInfo = initialProducts.find(p => p.id === top.id);
          return { name: staticInfo?.name || 'N/A', quantity: top.quantity || 0};
      }
      return {name: 'N/A', quantity: 0};
  }, [topProducts]);

  const totalExportValue = exports?.reduce((sum, e) => sum + Number(e.quantity || 0), 0) ?? 0;
  
  const isLoading = isTransactionsLoading || isProductsLoading || isExportsLoading;

  const cards = [
    {
      title: 'Total Revenue',
      value: `$${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: 'from last month',
      icon: DollarSign,
    },
    {
      title: 'Total Expenses',
      value: `$${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: 'from last month',
      icon: DollarSign,
    },
     {
      title: 'Top Product',
      value: topProduct.name,
      change: `${topProduct.quantity} units sold this month`,
      icon: Package,
    },
    {
      title: 'Export Value',
      value: `$${totalExportValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: 'in the current month',
      icon: Ship,
    },
  ];

  if (isLoading) {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((kpi) => (
        <Card key={kpi.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
            <kpi.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
            {kpi.title.includes('Total') && <p className="text-xs text-muted-foreground">+100.0% {kpi.change}</p>}
            {kpi.title === 'Top Product' && <p className="text-xs text-muted-foreground">{kpi.change}</p>}
            {kpi.title === 'Export Value' && <p className="text-xs text-muted-foreground">{kpi.change}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
