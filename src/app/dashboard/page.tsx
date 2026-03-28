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
import type { FinancialTransaction, Export, Product, LocalSale, CoconutPurchase } from '@/lib/types';
import { useMemo, useState, useEffect } from 'react';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  format,
  isWithinInterval,
} from 'date-fns';
import { DollarSign, Package, TrendingUp, ArrowDownRight, ArrowUpRight, User as UserIcon, Circle, Wallet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { initialProducts } from '@/lib/data';

function toSafeDate(value: any): Date {
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === 'function') return value.toDate();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

export default function DashboardPage() {
  const [allTransactions, setAllTransactions] = useState<FinancialTransaction[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<FinancialTransaction[]>([]);
  const [allExports, setAllExports] = useState<Export[]>([]);
  const [allLocalSales, setAllLocalSales] = useState<LocalSale[]>([]);
  const [allCoconutPurchases, setAllCoconutPurchases] = useState<CoconutPurchase[]>([]);
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [processedByWorkers, setProcessedByWorkers] = useState(0);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [isLoadingExports, setIsLoadingExports] = useState(true);
  const [isLoadingLocalSales, setIsLoadingLocalSales] = useState(true);
  const [isLoadingCoconutPurchases, setIsLoadingCoconutPurchases] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [transactionsRes, recentTransactionsRes, exportsRes, localSalesRes, coconutPurchasesRes, productsRes] = await Promise.all([
          fetch('/api/financial-transactions'),
          fetch('/api/financial-transactions?limit=5'),
          fetch('/api/exports'),
          fetch('/api/local-sales'),
          fetch('/api/coconut-purchases'),
          fetch('/api/products'),
        ]);

        if (transactionsRes.ok) {
          const data = await transactionsRes.json();
          setAllTransactions(Array.isArray(data) ? data : []);
        }
        if (recentTransactionsRes.ok) {
          const data = await recentTransactionsRes.json();
          setRecentTransactions(Array.isArray(data) ? data : []);
        }
        if (exportsRes.ok) {
          const data = await exportsRes.json();
          setAllExports(Array.isArray(data) ? data : []);
        }
        if (localSalesRes.ok) {
          const data = await localSalesRes.json();
          setAllLocalSales(Array.isArray(data) ? data : []);
        }
        if (coconutPurchasesRes.ok) {
          const data = await coconutPurchasesRes.json();
          setAllCoconutPurchases(Array.isArray(data) ? data : []);
        }
        if (productsRes.ok) {
          const data = await productsRes.json();
          setDbProducts(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoadingTransactions(false);
        setIsLoadingRecent(false);
        setIsLoadingExports(false);
        setIsLoadingLocalSales(false);
        setIsLoadingCoconutPurchases(false);
        setIsLoadingProducts(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    const loadProcessedByWorkers = async () => {
      try {
        const res = await fetch('/api/coconut-worker');
        if (!res.ok) throw new Error('Failed to fetch coconut worker entries');
        const parsed = await res.json();
        if (!Array.isArray(parsed)) throw new Error('Invalid coconut worker entries response');
        const total = parsed.reduce((acc: number, entry: any) => acc + (Number(entry?.processedCoconuts) || 0), 0);
        setProcessedByWorkers(total);
      } catch {
        setProcessedByWorkers(0);
      }
    };

    void loadProcessedByWorkers();
    if (typeof window !== 'undefined') {
      window.addEventListener('coconut-worker:changed', loadProcessedByWorkers as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('coconut-worker:changed', loadProcessedByWorkers as EventListener);
      }
    };
  }, []);

  const products = useMemo(() => {
    const initialProductMap = new Map<string, Product>(initialProducts.map(p => [p.id, { ...p }]));
    
    if (dbProducts) {
      dbProducts.forEach(dbProduct => {
        if (initialProductMap.has(dbProduct.id)) {
          const initialProduct = initialProductMap.get(dbProduct.id)!;
          initialProduct.quantity = dbProduct.quantity;
        } else {
           initialProductMap.set(dbProduct.id, dbProduct);
        }
      });
    }

    return Array.from(initialProductMap.values());
  }, [dbProducts]);

  const {
    totalRevenue,
    revenueChange,
    totalExpenses,
    expenseChange,
    netProfit,
    netProfitChange,
    exportValue,
    localSaleValue,
    topProduct,
    topInternationalClient,
    topLocalClient,
    totalCoconutPurchased,
    coconutAvailableStock,
    chartData,
  } = useMemo(() => {
    if (!allTransactions || !allExports || !allLocalSales || !allCoconutPurchases || !products) {
      return {
        totalRevenue: 0,
        revenueChange: 0,
        totalExpenses: 0,
        expenseChange: 0,
        netProfit: 0,
        netProfitChange: 0,
        exportValue: 0,
        localSaleValue: 0,
        topProduct: { name: 'N/A', units: 0 },
        topInternationalClient: { name: 'N/A', value: 0 },
        topLocalClient: { name: 'N/A', value: 0 },
        totalCoconutPurchased: 0,
        coconutAvailableStock: 0,
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

    let currentMonthIncome = 0;
    let prevMonthIncome = 0;
    let currentMonthExpenses = 0;
    let prevMonthExpenses = 0;
    
    // Revenue and profit should come from the financial ledger only.
    // Paid exports/local sales already create income transactions there.
    allTransactions.forEach((t) => {
      const transactionDate = toSafeDate(t.date);
      if (t.type === 'income') {
        if (isWithinInterval(transactionDate, currentMonthInterval)) {
          currentMonthIncome += t.amount;
        } else if (isWithinInterval(transactionDate, prevMonthInterval)) {
          prevMonthIncome += t.amount;
        }
      } else if (t.type === 'expense') {
        if (isWithinInterval(transactionDate, currentMonthInterval)) {
          currentMonthExpenses += Math.abs(t.amount);
        } else if (isWithinInterval(transactionDate, prevMonthInterval)) {
          prevMonthExpenses += Math.abs(t.amount);
        }
      }
    });

    const productsMap = new Map(products.map(p => [p.id, p]));
    const productSales = new Map<string, number>();

    // Process exports
    const clientExportValues = new Map<string, {name: string, value: number}>();
    const currentMonthExports = allExports.filter(e => isWithinInterval(toSafeDate(e.date), currentMonthInterval));

    const currentMonthExportValue = currentMonthExports.reduce((acc, e) => {
      const saleValue = e.quantity * e.price;

      const product = productsMap.get(e.productId as any);
      if (product) {
         productSales.set(product.name, (productSales.get(product.name) || 0) + e.quantity);
      }

      const clientRecord = clientExportValues.get(e.clientId) || { name: e.clientName, value: 0 };
      clientRecord.value += saleValue;
      clientExportValues.set(e.clientId, clientRecord);

      return acc + saleValue;
    }, 0);
    
    // Process local sales
    const clientLocalSaleValues = new Map<string, {name: string, value: number}>();
    const currentMonthLocalSales = allLocalSales.filter(s => isWithinInterval(toSafeDate(s.date), currentMonthInterval));

    const currentMonthLocalSaleValue = currentMonthLocalSales.reduce((acc, s) => {
      const saleValue = s.quantity * s.price;
      
      const product = productsMap.get(s.productId as any);
      if (product) {
         productSales.set(product.name, (productSales.get(product.name) || 0) + s.quantity);
      }

      const clientRecord = clientLocalSaleValues.get(s.clientId) || { name: s.clientName, value: 0 };
      clientRecord.value += saleValue;
      clientLocalSaleValues.set(s.clientId, clientRecord);
      
      return acc + saleValue;
    }, 0);

    const currentMonthRevenue = currentMonthIncome;
    const prevMonthRevenue = prevMonthIncome;
    
    // Net Profit
    const currentMonthNetProfit = currentMonthRevenue - currentMonthExpenses;
    const prevMonthNetProfit = prevMonthRevenue - prevMonthExpenses;

    // Calculate percentage changes
    const revenueChange = prevMonthRevenue > 0 ? ((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : currentMonthRevenue > 0 ? 100 : 0;
    const expenseChange = prevMonthExpenses > 0 ? ((currentMonthExpenses - prevMonthExpenses) / prevMonthExpenses) * 100 : currentMonthExpenses > 0 ? 100 : 0;
    const netProfitChange = prevMonthNetProfit !== 0 ? ((currentMonthNetProfit - prevMonthNetProfit) / Math.abs(prevMonthNetProfit)) * 100 : currentMonthNetProfit > 0 ? 100 : 0;
    
    // Determine top clients
    const topInternational = [...clientExportValues.values()].sort((a,b) => b.value - a.value)[0];
    const topLocal = [...clientLocalSaleValues.values()].sort((a,b) => b.value - a.value)[0];
    const topInternationalClient = topInternational ? { name: topInternational.name, value: topInternational.value } : { name: 'N/A', value: 0 };
    const topLocalClient = topLocal ? { name: topLocal.name, value: topLocal.value } : { name: 'N/A', value: 0 };
    const totalCoconutPurchased = allCoconutPurchases.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);
    const rawCoconutStock = products.find((p) => p.id === 'coconut')?.quantity ?? 0;
    const coconutAvailableStock = Math.max(0, rawCoconutStock - processedByWorkers);

    // Determine top product based on quantity sold
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
      const monthKey = format(toSafeDate(t.date), 'MMM-yyyy');
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
      netProfit: currentMonthNetProfit,
      netProfitChange,
      exportValue: currentMonthExportValue,
      localSaleValue: currentMonthLocalSaleValue,
      topProduct,
      topInternationalClient,
      topLocalClient,
      totalCoconutPurchased,
      coconutAvailableStock,
      chartData: Array.from(monthMap.values()),
    };
  }, [allTransactions, allExports, allLocalSales, allCoconutPurchases, products, processedByWorkers]);

  const isLoading = isLoadingTransactions || isLoadingExports || isLoadingRecent || isLoadingProducts || isLoadingLocalSales || isLoadingCoconutPurchases;

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {isLoading ? <Skeleton className="h-32" /> : <Card className="xl:col-span-1">
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

        {isLoading ? <Skeleton className="h-32" /> :<Card className="xl:col-span-1">
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

        {isLoading ? <Skeleton className="h-32" /> : <Card className="xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${netProfit.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center">
              {netProfitChange >= 0 ? <ArrowUpRight className="h-4 w-4 text-green-500" /> : <ArrowDownRight className="h-4 w-4 text-red-500" />}
              {netProfitChange.toFixed(1)}% from last month
            </p>
          </CardContent>
        </Card>}

        {isLoading ? <Skeleton className="h-32" /> : <Card className="xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Product</CardTitle>
             <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topProduct.name}</div>
            <p className="text-xs text-muted-foreground">
              {topProduct.units.toLocaleString()} units sold this month
            </p>
          </CardContent>
        </Card>}
        
        {isLoading ? <Skeleton className="h-32" /> : <Card className="xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Export Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${exportValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">In the current month</p>
          </CardContent>
        </Card>}
        
        {isLoading ? <Skeleton className="h-32" /> : <Card className="xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Local Sale Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${localSaleValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">In the current month</p>
          </CardContent>
        </Card>}
         {isLoading ? <Skeleton className="h-32" /> : <Card className="xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Int'l Client</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{topInternationalClient.name}</div>
            <p className="text-xs text-muted-foreground">
              ${topInternationalClient.value.toLocaleString()} this month
            </p>
          </CardContent>
        </Card>}
         {isLoading ? <Skeleton className="h-32" /> : <Card className="xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Local Client</CardTitle>
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold truncate">{topLocalClient.name}</div>
            <p className="text-xs text-muted-foreground">
              ${topLocalClient.value.toLocaleString()} this month
            </p>
          </CardContent>
        </Card>}
         {isLoading ? <Skeleton className="h-32" /> : <Card className="xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Coconut Purchased</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCoconutPurchased.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">All-time coconut units purchased</p>
          </CardContent>
        </Card>}
         {isLoading ? <Skeleton className="h-32" /> : <Card className="xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Coconut Available</CardTitle>
            <Circle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{coconutAvailableStock.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Current coconut stock units</p>
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
                        <div className="hidden text-sm text-muted-foreground md:inline">{format(toSafeDate(t.date), 'PP')}</div>
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
