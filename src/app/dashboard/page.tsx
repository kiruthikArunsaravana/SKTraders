'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, limit, Timestamp } from 'firebase/firestore';
import type { FinancialTransaction, Export } from '@/lib/types';
import { useMemo } from 'react';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  isWithinInterval,
} from 'date-fns';
import { DollarSign, Package, TrendingUp, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DashboardPage() {
  const firestore = useFirestore();

  // Queries
  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'financial_transactions'),
      orderBy('date', 'desc')
    );
  }, [firestore]);

  const recentTransactionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'financial_transactions'),
      orderBy('date', 'desc'),
      limit(5)
    );
  }, [firestore]);

  const exportsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'exports'), orderBy('exportDate', 'desc'));
  }, [firestore]);

  // Data fetching
  const { data: allTransactions, isLoading: isLoadingTransactions } =
    useCollection<FinancialTransaction>(transactionsQuery);
  const { data: recentTransactions, isLoading: isLoadingRecent } =
    useCollection<FinancialTransaction>(recentTransactionsQuery);
  const { data: allExports, isLoading: isLoadingExports } =
    useCollection<Export>(exportsQuery);

  const {
    totalRevenue,
    revenueChange,
    totalExpenses,
    expenseChange,
    exportValue,
    topProduct,
    chartData,
  } = useMemo(() => {
    if (!allTransactions || !allExports) {
      return {
        totalRevenue: 0,
        revenueChange: 0,
        totalExpenses: 0,
        expenseChange: 0,
        exportValue: 0,
        topProduct: { name: 'N/A', units: 0 },
        chartData: [],
      };
    }

    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const prevMonthStart = startOfMonth(subMonths(now, 1));
    const prevMonthEnd = endOfMonth(subMonths(now, 1));

    const currentMonthInterval = { start: currentMonthStart, end: currentMonthEnd };
    const prevMonthInterval = { start: prevMonthStart, end: prevMonthEnd };

    let currentMonthRevenue = 0;
    let prevMonthRevenue = 0;
    let currentMonthExpenses = 0;
    let prevMonthExpenses = 0;
    
    const productSales = new Map<string, number>();

    // Process all transactions
    allTransactions.forEach((t) => {
      const transactionDate = t.date.toDate();
      if (t.type === 'income') {
        if (isWithinInterval(transactionDate, currentMonthInterval)) {
          currentMonthRevenue += t.amount;
          productSales.set(t.category, (productSales.get(t.category) || 0) + 1); // Assuming 1 unit per transaction for simplicity
        } else if (isWithinInterval(transactionDate, prevMonthInterval)) {
          prevMonthRevenue += t.amount;
        }
      } else if (t.type === 'expense') {
        if (isWithinInterval(transactionDate, currentMonthInterval)) {
          currentMonthExpenses += Math.abs(t.amount);
        } else if (isWithinInterval(transactionDate, prevMonthInterval)) {
          prevMonthExpenses += Math.abs(t.amount);
        }
      }
    });

    // Calculate percentage changes
    const revenueChange = prevMonthRevenue > 0 ? ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : currentMonthRevenue > 0 ? 100 : 0;
    const expenseChange = prevMonthExpenses > 0 ? ((currentMonthExpenses - prevMonthExpenses) / prevMonthExpenses) * 100 : currentMonthExpenses > 0 ? 100 : 0;

    // Process exports
    const currentMonthExportValue = allExports
        .filter(e => isWithinInterval(e.exportDate.toDate(), currentMonthInterval))
        .reduce((acc, e) => acc + e.quantity, 0);

    // Determine top product
    const top = [...productSales.entries()].sort((a, b) => b[1] - a[1])[0];
    const topProduct = top ? { name: top[0], units: top[1] } : { name: 'N/A', units: 0 };

    // Process chart data for the last 12 months
    const monthlyData = new Array(12).fill(0).map((_, i) => {
      const month = subMonths(now, i);
      return {
        month: format(month, 'MMM'),
        year: format(month, 'yyyy'),
        revenue: 0,
        expenses: 0,
      };
    }).reverse();

    const monthMap = new Map(monthlyData.map(d => [`${d.month}-${d.year}`, d]));

    allTransactions.forEach(t => {
      const monthKey = format(t.date.toDate(), 'MMM-yyyy');
      if (monthMap.has(monthKey)) {
        const entry = monthMap.get(monthKey)!;
        if (t.type === 'income') {
          entry.revenue += t.amount;
        } else {
          entry.expenses += Math.abs(t.amount);
        }
      }
    });
    
    return {
      totalRevenue: currentMonthRevenue,
      revenueChange,
      totalExpenses: currentMonthExpenses,
      expenseChange,
      exportValue: currentMonthExportValue,
      topProduct,
      chartData: Array.from(monthMap.values()),
    };
  }, [allTransactions, allExports]);

  const isLoading = isLoadingTransactions || isLoadingExports || isLoadingRecent;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {isLoading ? <Skeleton className="h-32" /> : <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              {revenueChange >= 0 ? <ArrowUpRight className="h-4 w-4 text-green-500" /> : <ArrowDownRight className="h-4 w-4 text-red-500" />}
              {revenueChange.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>}

        {isLoading ? <Skeleton className="h-32" /> :<Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpenses.toLocaleString()}</div>
             <p className="text-xs text-muted-foreground flex items-center">
              {expenseChange >= 0 ? <ArrowUpRight className="h-4 w-4 text-red-500" /> : <ArrowDownRight className="h-4 w-4 text-green-500" />}
              {expenseChange.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>}

        {isLoading ? <Skeleton className="h-32" /> : <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Product</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topProduct.name}</div>
            <p className="text-xs text-muted-foreground">
              {topProduct.units} units sold this month
            </p>
          </CardContent>
        </Card>}
        
        {isLoading ? <Skeleton className="h-32" /> : <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Export Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${exportValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">In the current month</p>
          </CardContent>
        </Card>}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Sales Performance</CardTitle>
            <CardDescription>A comparison of your sales and expenses over the last year.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {isLoading ? <Skeleton className="h-[350px] w-full" /> : <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                <XAxis
                  dataKey="month"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `$${value / 1000}k`}
                />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}/>
                <Legend />
                <Bar dataKey="revenue" name="Sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>}
          </CardContent>
        </Card>
        <Card className="col-span-4 lg:col-span-3">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              Your 5 most recent sales and purchases.
            </CardDescription>
          </CardHeader>
          <CardContent>
             <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client/Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className='text-right'>Product/Category</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && Array.from({length: 5}).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))}
                  {!isLoading && recentTransactions?.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <div className="font-medium">{t.description}</div>
                        <div className="hidden text-sm text-muted-foreground md:inline">{format(t.date.toDate(), 'PP')}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={t.type === 'income' ? 'outline' : 'destructive'}>{t.type}</Badge>
                      </TableCell>
                      <TableCell className='text-right'>{t.category}</TableCell>
                    </TableRow>
                  ))}
                   {!isLoading && recentTransactions?.length === 0 && (
                     <TableRow>
                        <TableCell colSpan={3} className="text-center">No recent transactions.</TableCell>
                     </TableRow>
                   )}
                </TableBody>
              </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
