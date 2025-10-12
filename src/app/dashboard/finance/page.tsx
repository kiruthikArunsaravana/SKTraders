'use client';

import { PlusCircle, Calendar as CalendarIcon, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import React, { useState, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { FinancialTransaction } from '@/lib/types';
import { format, isToday, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Line,
  LineChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { addTransactionAction } from './actions';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

const expenseCategories = [
  { id: 'husk', name: 'Husk' },
  { id: 'maintenance', name: 'Maintenance' },
  { id: 'labour', name: 'Labour' },
  { id: 'other', name: 'Other' },
];

const incomeProducts = [
  { id: 'coco-pith', name: 'Coco Pith' },
  { id: 'coir-fiber', name: 'Coir Fiber' },
  { id: 'husk-chips', name: 'Husk Chips' },
  { id: 'other', name: 'Other' },
];

export default function FinancePage() {
  const { toast } = useToast();
  const [isAddEntryDialogOpen, setAddEntryDialogOpen] = useState(false);
  const [entryType, setEntryType] = useState('income');
  const [entryDate, setEntryDate] = useState<Date | undefined>(new Date());
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const [dateRange1, setDateRange1] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [dateRange2, setDateRange2] = useState<DateRange | undefined>();

  const firestore = useFirestore();

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'financial_transactions'), orderBy('date', 'desc'));
  }, [firestore]);

  const { data: transactions, isLoading } = useCollection<FinancialTransaction>(transactionsQuery);

  const handleAddEntry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set(
      'date',
      entryDate ? format(entryDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
    );

    const result = await addTransactionAction(formData);

    if (result.success && result.newTransaction) {
      // Data will be updated automatically by useCollection
      setAddEntryDialogOpen(false);
      (event.target as HTMLFormElement).reset();
      setEntryDate(new Date()); // Reset date for next entry
      toast({
        title: 'Entry Added',
        description: `A new ${result.newTransaction.type} entry for $${Math.abs(
          result.newTransaction.amount
        )} has been recorded.`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Error adding transaction',
        description:
          (result.error as string) || 'An unknown error occurred.',
      });
    }
  };

  const processTransactionsForRange = (range: DateRange | undefined, trans: FinancialTransaction[] = []) => {
    if (!range?.from || !range?.to || !trans) {
      return { totalIncome: 0, totalExpenses: 0, netProfit: 0, dailyData: new Map() };
    }

    const startDate = range.from;
    const endDate = range.to;
    endDate.setHours(23, 59, 59, 999);

    const filtered = trans.filter(t => {
        const transactionDate = t.date.toDate();
        return isWithinInterval(transactionDate, { start: startDate, end: endDate });
    });

    let totalIncome = 0;
    let totalExpenses = 0;
    const dailyData = new Map<string, { income: number; expenses: number }>();

    filtered.forEach(t => {
      const day = format(t.date.toDate(), 'yyyy-MM-dd');
      if (!dailyData.has(day)) {
        dailyData.set(day, { income: 0, expenses: 0 });
      }
      const dayData = dailyData.get(day)!;

      if (t.type === 'income') {
        totalIncome += t.amount;
        dayData.income += t.amount;
      } else {
        totalExpenses += t.amount;
        dayData.expenses += Math.abs(t.amount);
      }
    });

    return {
      totalIncome,
      totalExpenses: Math.abs(totalExpenses),
      netProfit: totalIncome + totalExpenses,
      dailyData,
    };
  };

  const { summary1, summary2, combinedChartData } = useMemo(() => {
    const summary1 = processTransactionsForRange(dateRange1, transactions || []);
    const summary2 = processTransactionsForRange(dateRange2, transactions || []);

    let allDates: Date[] = [];
    if (dateRange1?.from && dateRange1?.to) {
      allDates.push(...eachDayOfInterval({ start: dateRange1.from, end: dateRange1.to }));
    }
    if (dateRange2?.from && dateRange2?.to) {
      allDates.push(...eachDayOfInterval({ start: dateRange2.from, end: dateRange2.to }));
    }

    const uniqueDates = [...new Set(allDates.map(d => format(d, 'yyyy-MM-dd')))].sort();

    const chartData = uniqueDates.map(dateStr => {
      const data1 = summary1.dailyData.get(dateStr) || { income: 0, expenses: 0 };
      const data2 = summary2.dailyData.get(dateStr) || { income: 0, expenses: 0 };
      return {
        date: format(new Date(dateStr), 'MMM d'),
        'Period 1 Income': data1.income,
        'Period 1 Expenses': data1.expenses,
        'Period 2 Income': data2.income,
        'Period 2 Expenses': data2.expenses,
      };
    });

    return { summary1, summary2, combinedChartData: chartData };
  }, [transactions, dateRange1, dateRange2]);

  const handleGeneratePdf = () => {
     // Implementation remains the same
  };

  const { todaysIncome, todaysExpenses, monthlySummary } = useMemo(() => {
    if (!transactions) {
        return { todaysIncome: [], todaysExpenses: [], monthlySummary: processTransactionsForRange(undefined) };
    }
    const todaysIncome = transactions.filter(t => isToday(t.date.toDate()) && t.type === 'income');
    const todaysExpenses = transactions.filter(t => isToday(t.date.toDate()) && t.type === 'expense');
    const monthlySummary = processTransactionsForRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }, transactions);
    return { todaysIncome, todaysExpenses, monthlySummary };
  }, [transactions]);


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline">Finance Management</h1>
        <Dialog open={isAddEntryDialogOpen} onOpenChange={setAddEntryDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-5 w-5" /> Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Financial Entry</DialogTitle>
              <DialogDescription>Record a new income or expense transaction.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddEntry}>
              <div className="space-y-4 py-4">
                <RadioGroup
                  defaultValue="income"
                  name="type"
                  className="flex gap-4"
                  onValueChange={setEntryType}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="income" id="income" />
                    <Label htmlFor="income">Income</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="expense" id="expense" />
                    <Label htmlFor="expense">Expense</Label>
                  </div>
                </RadioGroup>
                <Input id="amount" name="amount" type="number" placeholder="Amount" required />
                <Input id="description" name="description" placeholder="Description" required />
                {entryType === 'expense' ? (
                  <Select name="category" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map(c => (
                        <SelectItem key={c.id} value={c.name}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Select name="category" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {incomeProducts.map(p => (
                        <SelectItem key={p.id} value={p.name}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={'outline'}
                      className={cn('w-full justify-start text-left font-normal')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {entryDate ? format(entryDate, 'PPP') : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={entryDate} onSelect={setEntryDate} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
              <DialogFooter>
                <Button type="submit">Add Entry</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
           <Card>
            <CardHeader><CardTitle>Financial Overview</CardTitle><CardDescription>A summary of your finances for this month.</CardDescription></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {isLoading ? (
                <>
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </>
              ) : (
                <>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-lg">Total Income</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold text-green-600">${monthlySummary.totalIncome.toLocaleString()}</p></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-lg">Total Expenses</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold text-red-600">-${monthlySummary.totalExpenses.toLocaleString()}</p></CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-lg">Net Profit</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold">${monthlySummary.netProfit.toLocaleString()}</p></CardContent>
                  </Card>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="income">
          <Card>
            <CardHeader>
              <CardTitle>Today's Income</CardTitle>
              <CardDescription>Income transactions recorded today.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>}
                  {!isLoading && todaysIncome.length > 0
                    ? todaysIncome.map(t => (
                        <TableRow key={t.id}>
                          <TableCell>{t.description}</TableCell>
                          <TableCell>{t.category}</TableCell>
                          <TableCell className="text-right">${t.amount.toLocaleString()}</TableCell>
                        </TableRow>
                      ))
                    : !isLoading && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center">
                            No income recorded today.
                          </TableCell>
                        </TableRow>
                      )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="expenses">
          <Card>
            <CardHeader>
              <CardTitle>Today's Expenses</CardTitle>
              <CardDescription>Expense transactions recorded today.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>}
                  {!isLoading && todaysExpenses.length > 0
                    ? todaysExpenses.map(t => (
                        <TableRow key={t.id}>
                          <TableCell>{t.description}</TableCell>
                          <TableCell>{t.category}</TableCell>
                          <TableCell className="text-right">
                            -${Math.abs(t.amount).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    : !isLoading && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center">
                            No expenses recorded today.
                          </TableCell>
                        </TableRow>
                      )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>Financial Comparison</CardTitle>
              <div className="flex justify-between items-center">
                <CardDescription>
                  Compare income and expenses across two date ranges.
                </CardDescription>
                <Button variant="outline" size="sm" onClick={handleGeneratePdf}>
                  <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !dateRange1 && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange1?.from ? (
                        dateRange1.to ? (
                          <>
                            {format(dateRange1.from, 'LLL dd, y')} -{' '}
                            {format(dateRange1.to, 'LLL dd, y')}
                          </>
                        ) : (
                          format(dateRange1.from, 'LLL dd, y')
                        )
                      ) : (
                        <span>Pick Period 1</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange1?.from}
                      selected={dateRange1}
                      onSelect={setDateRange1}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !dateRange2 && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange2?.from ? (
                        dateRange2.to ? (
                          <>
                            {format(dateRange2.from, 'LLL dd, y')} -{' '}
                            {format(dateRange2.to, 'LLL dd, y')}
                          </>
                        ) : (
                          format(dateRange2.from, 'LLL dd, y')
                        )
                      ) : (
                        <span>Pick Period 2 (Optional)</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange2?.from}
                      selected={dateRange2}
                      onSelect={setDateRange2}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Period 1 Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Income</span>
                      <span className="font-medium text-green-600">
                        ${summary1.totalIncome.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Expenses</span>
                      <span className="font-medium text-red-600">
                        -${summary1.totalExpenses.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Net Profit</span>
                      <span className={summary1.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}>
                        ${summary1.netProfit.toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Period 2 Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Income</span>
                      <span className="font-medium text-green-600">
                        ${summary2.totalIncome.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total Expenses</span>
                      <span className="font-medium text-red-600">
                        -${summary2.totalExpenses.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Net Profit</span>
                      <span className={summary2.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}>
                        ${summary2.netProfit.toLocaleString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div ref={chartContainerRef} className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={combinedChartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="date"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={value => `$${value / 1000}k`}
                    />
                    <Tooltip
                      cursor={{ fill: 'hsl(var(--muted))' }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 'var(--radius)',
                      }}
                    />
                    <Legend iconSize={10} />
                    <Line
                      type="monotone"
                      dataKey="Period 1 Income"
                      stroke="hsl(var(--chart-1))"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="Period 1 Expenses"
                      stroke="hsl(var(--chart-2))"
                      strokeWidth={2}
                      dot={false}
                    />
                    {dateRange2 && (
                      <Line
                        type="monotone"
                        dataKey="Period 2 Income"
                        stroke="hsl(var(--chart-3))"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        dot={false}
                      />
                    )}
                    {dateRange2 && (
                      <Line
                        type="monotone"
                        dataKey="Period 2 Expenses"
                        stroke="hsl(var(--chart-4))"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        dot={false}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
