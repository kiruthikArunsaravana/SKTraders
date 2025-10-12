'use server';

import {
  collection,
  query,
  where,
  getDocs,
  limit,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { getSdks } from '@/firebase';
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

type RecentTransaction = {
  id: string;
  clientName: string;
  product: string;
  amount: number;
  type: 'Income' | 'Expense';
  clientAvatarUrl: string; // Placeholder for now
};

type SalesByMonth = {
  month: string;
  sales: number;
  expenses: number;
};

async function getFinancialsForPeriod(
  startDate: Date,
  endDate: Date
): Promise<{ revenue: number; expenses: number }> {
  const { firestore } = getSdks();
  const transactionsRef = collection(firestore, 'financial_transactions');

  const incomeQuery = query(
    transactionsRef,
    where('type', '==', 'income'),
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate))
  );
  const expenseQuery = query(
    transactionsRef,
    where('type', '==', 'expense'),
    where('date', '>=', Timestamp.fromDate(startDate)),
    where('date', '<=', Timestamp.fromDate(endDate))
  );

  const [incomeSnapshot, expenseSnapshot] = await Promise.all([
    getDocs(incomeQuery),
    getDocs(expenseQuery),
  ]);

  const revenue = incomeSnapshot.docs.reduce(
    (sum, doc) => sum + doc.data().amount,
    0
  );
  const expenses = expenseSnapshot.docs.reduce(
    (sum, doc) => sum + doc.data().amount,
    0
  );

  return { revenue, expenses: Math.abs(expenses) };
}

export async function getDashboardKpiData(): Promise<KpiData> {
  try {
    const { firestore } = getSdks();
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonth = subMonths(now, 1);
    const lastMonthStart = startOfMonth(lastMonth);
    const lastMonthEnd = endOfMonth(lastMonth);

    // This month's and last month's financials
    const [thisMonthFinancials, lastMonthFinancials] = await Promise.all([
      getFinancialsForPeriod(thisMonthStart, thisMonthEnd),
      getFinancialsForPeriod(lastMonthStart, lastMonthEnd),
    ]);

    const totalRevenue = thisMonthFinancials.revenue;
    const totalExpenses = thisMonthFinancials.expenses;
    const lastMonthRevenue = lastMonthFinancials.revenue;
    const lastMonthExpenses = lastMonthFinancials.expenses;

    // Top product this month
    const topProductQuery = query(
      collection(firestore, 'financial_transactions'),
      where('type', '==', 'income'),
      where('date', '>=', Timestamp.fromDate(thisMonthStart)),
      where('date', '<=', Timestamp.fromDate(thisMonthEnd))
    );
    const topProductSnapshot = await getDocs(topProductQuery);
    const productCounts: { [key: string]: number } = {};
    topProductSnapshot.forEach((doc) => {
      const category = doc.data().category;
      productCounts[category] = (productCounts[category] || 0) + 1;
    });

    let topProduct = { name: 'N/A', unitsSold: 0 };
    if (Object.keys(productCounts).length > 0) {
        const [name, unitsSold] = Object.entries(productCounts).reduce((a, b) => a[1] > b[1] ? a : b);
        topProduct = { name, unitsSold };
    }


    // Total export value this month
    const exportsQuery = query(
      collection(firestore, 'exports'),
      where('date', '>=', Timestamp.fromDate(thisMonthStart)),
      where('date', '<=', Timestamp.fromDate(thisMonthEnd))
    );
    const exportSnapshot = await getDocs(exportsQuery);
    const totalExportValue = exportSnapshot.docs.reduce(
      (sum, doc) => sum + doc.data().value,
      0
    );

    const revenueChange =
      lastMonthRevenue > 0
        ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
        : totalRevenue > 0
        ? 100
        : 0;
    const expensesChange =
      lastMonthExpenses > 0
        ? ((totalExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
        : totalExpenses > 0
        ? 100
        : 0;

    return {
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      revenueChange,
      expensesChange,
      topProduct,
      totalExportValue,
    };
  } catch (error) {
    console.error('Firestore Error (getDashboardKpiData):', error);
    return {
      totalRevenue: 0,
      totalExpenses: 0,
      netProfit: 0,
      revenueChange: 0,
      expensesChange: 0,
      topProduct: { name: 'N/A', unitsSold: 0 },
      totalExportValue: 0,
    };
  }
}

export async function getRecentTransactionsAction(): Promise<RecentTransaction[]> {
  try {
    const { firestore } = getSdks();
    const transactionsRef = collection(firestore, 'financial_transactions');
    const q = query(transactionsRef, orderBy('date', 'desc'), limit(5));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data() as FinancialTransaction;
      return {
        id: doc.id,
        clientName: data.description,
        product: data.category,
        amount: data.amount,
        type: data.type.charAt(0).toUpperCase() + data.type.slice(1) as 'Income' | 'Expense',
        clientAvatarUrl: `https://picsum.photos/seed/${doc.id}/40/40`,
      };
    });
  } catch (error) {
    console.error('Firestore Error (getRecentTransactionsAction):', error);
    return [];
  }
}

export async function getSalesByMonthAction(): Promise<SalesByMonth[]> {
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const result: SalesByMonth[] = monthNames.map((m) => ({
    month: m,
    sales: 0,
    expenses: 0,
  }));

  try {
    const { firestore } = getSdks();
    const oneYearAgo = subMonths(new Date(), 12);
    const transactionsRef = collection(firestore, 'financial_transactions');
    const q = query(
      transactionsRef,
      where('date', '>=', Timestamp.fromDate(oneYearAgo))
    );
    const querySnapshot = await getDocs(q);

    querySnapshot.forEach((doc) => {
      const data = doc.data() as FinancialTransaction;
      const monthIndex = data.date.toDate().getMonth();
      const monthName = monthNames[monthIndex];
      if (monthName) {
        const existing = result.find((r) => r.month === monthName);
        if (existing) {
          if (data.type === 'income') {
            existing.sales += data.amount;
          } else {
            existing.expenses += Math.abs(data.amount);
          }
        }
      }
    });

    return result;
  } catch (error) {
    console.error('Firestore Error (getSalesByMonthAction):', error);
    return result;
  }
}
