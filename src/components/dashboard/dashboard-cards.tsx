'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Receipt, TrendingUp, Ship } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { subMonths, startOfMonth, endOfMonth } from 'date-fns';
import type { FinancialTransaction, Export } from '@/lib/types';


type KpiData = {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueChange: number; // Percentage change from last month
  expensesChange: number; // Percentage change from last month
  topProduct: { name: string | null; unitsSold: number | null };
  totalExportValue: number;
};

function formatChange(change: number) {
    if (change === 0) return 'No change from last month';
    const sign = change > 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}% from last month`;
}

export default function DashboardCards() {
  const firestore = useFirestore();
  const [kpiData, setKpiData] = useState<KpiData>({
      totalRevenue: 0,
      totalExpenses: 0,
      netProfit: 0,
      revenueChange: 0,
      expensesChange: 0,
      topProduct: { name: 'N/A', unitsSold: 0 },
      totalExportValue: 0,
  });

  const now = useMemo(() => new Date(), []);
  const thisMonthStart = useMemo(() => startOfMonth(now), [now]);
  const thisMonthEnd = useMemo(() => endOfMonth(now), [now]);
  const lastMonth = useMemo(() => subMonths(now, 1), [now]);
  const lastMonthStart = useMemo(() => startOfMonth(lastMonth), [lastMonth]);
  const lastMonthEnd = useMemo(() => endOfMonth(lastMonth), [lastMonth]);

  const allTransactionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'financial_transactions'));
  }, [firestore]);
  
  const { data: allTransactions } = useCollection<FinancialTransaction>(allTransactionsQuery);

  const allExportsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'exports'));
  }, [firestore]);

  const { data: allExports } = useCollection<Export>(allExportsQuery);

  useEffect(() => {
    if (!allTransactions || !allExports) return;

    const getFinancialsForPeriod = (startDate: Date, endDate: Date) => {
        const filtered = allTransactions.filter(t => {
            const tDate = t.date.toDate();
            return tDate >= startDate && tDate <= endDate;
        });

        const revenue = filtered.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expenses = filtered.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        return { revenue, expenses: Math.abs(expenses) };
    }

    const thisMonthFinancials = getFinancialsForPeriod(thisMonthStart, thisMonthEnd);
    const lastMonthFinancials = getFinancialsForPeriod(lastMonthStart, lastMonthEnd);

    const totalRevenue = thisMonthFinancials.revenue;
    const totalExpenses = thisMonthFinancials.expenses;
    const lastMonthRevenue = lastMonthFinancials.revenue;
    const lastMonthExpenses = lastMonthFinancials.expenses;

    const thisMonthIncomeTransactions = allTransactions.filter(t => {
        const tDate = t.date.toDate();
        return t.type === 'income' && tDate >= thisMonthStart && tDate <= thisMonthEnd;
    });

    const productCounts: { [key: string]: number } = {};
    thisMonthIncomeTransactions.forEach((t) => {
      productCounts[t.category] = (productCounts[t.category] || 0) + 1; // Assuming 1 unit per transaction for simplicity
    });

    let topProduct = { name: 'N/A', unitsSold: 0 };
    if (Object.keys(productCounts).length > 0) {
        const [name, unitsSold] = Object.entries(productCounts).reduce((a, b) => a[1] > b[1] ? a : b);
        topProduct = { name, unitsSold };
    }

    const totalExportValue = allExports
      .filter(e => {
        const eDate = e.date.toDate();
        return eDate >= thisMonthStart && eDate <= thisMonthEnd;
      })
      .reduce((sum, e) => sum + e.value, 0);

    const revenueChange =
      lastMonthRevenue > 0
        ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : totalRevenue > 0 ? 100 : 0;
    const expensesChange =
      lastMonthExpenses > 0
        ? ((totalExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
        : totalExpenses > 0 ? 100 : 0;
    
    setKpiData({
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      revenueChange,
      expensesChange,
      topProduct,
      totalExportValue,
    });

  }, [allTransactions, allExports, thisMonthStart, thisMonthEnd, lastMonthStart, lastMonthEnd]);


  const cards = [
    {
      title: 'Total Revenue',
      value: `$${kpiData.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: formatChange(kpiData.revenueChange),
      icon: DollarSign,
    },
    {
      title: 'Total Expenses',
      value: `$${kpiData.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: formatChange(kpiData.expensesChange),
      icon: Receipt,
    },
    {
      title: 'Top Product',
      value: kpiData.topProduct.name,
      change: `${kpiData.topProduct.unitsSold || 0} units sold this month`,
      icon: TrendingUp,
    },
    {
      title: 'Export Value',
      value: `$${kpiData.totalExportValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: 'In the current month',
      icon: Ship,
    },
  ];

  return (
    <>
      {cards.map((kpi) => (
        <Card key={kpi.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
            <kpi.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <p className="text-xs text-muted-foreground">{kpi.change}</p>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
