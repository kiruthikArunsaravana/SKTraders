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
import React, { useState, useMemo } from 'react';
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
import type { FinancialTransaction, Client } from '@/lib/types';
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval } from 'date-fns';
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
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp, where, addDoc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

const expenseCategories = [
  { id: 'husk', name: 'Husk' },
  { id: 'coconut', name: 'Coconut' },
  { id: 'maintenance', name: 'Maintenance' },
  { id: 'labour', name: 'Labour' },
  { id: 'other', name: 'Other' },
];

const incomeProducts = [
  { id: 'coco-pith', name: 'Coco Pith' },
  { id: 'coir-fiber', name: 'Coir Fiber' },
  { id: 'husk-chips', name: 'Husk Chips' },
  { id: 'copra', name: 'Copra' },
  { id: 'other', name: 'Other' },
];


export default function FinancePage() {
  const { toast } = useToast();
  const [isAddEntryDialogOpen, setAddEntryDialogOpen] = useState(false);
  const [entryType, setEntryType] = useState('income');
  const [entryDate, setEntryDate] = useState<Date | undefined>(new Date());

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
  
  const clientsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'clients'));
  }, [firestore]);

  const { data: allTransactions, isLoading: isAllTransactionsLoading } = useCollection<FinancialTransaction>(transactionsQuery);
  const { data: clients, isLoading: isClientsLoading } = useCollection<Client>(clientsQuery);

  const todaysTransactionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());
    return query(
        collection(firestore, 'financial_transactions'),
        where('date', '>=', Timestamp.fromDate(todayStart)),
        where('date', '<=', Timestamp.fromDate(todayEnd)),
        orderBy('date', 'desc')
    );
  }, [firestore]);

  const { data: todaysTransactions, isLoading: isTodaysTransactionsLoading } = useCollection<FinancialTransaction>(todaysTransactionsQuery);
  
  const processTransactionsForRange = (range: DateRange | undefined, trans: FinancialTransaction[] = []) => {
      if (!range?.from || !trans) {
        return { totalIncome: 0, totalExpenses: 0, netProfit: 0, dailyData: new Map(), transactions: [] };
      }

      const startDate = range.from;
      const endDate = range.to ? new Date(range.to) : new Date(startDate);
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
          totalExpenses += Math.abs(t.amount);
          dayData.expenses += Math.abs(t.amount);
        }
      });

      return {
        totalIncome,
        totalExpenses,
        netProfit: totalIncome - totalExpenses,
        dailyData,
        transactions: filtered,
      };
    };
  
    const { summary1, summary2, combinedChartData } = useMemo(() => {
    const s1 = processTransactionsForRange(dateRange1, allTransactions ?? []);
    const s2 = processTransactionsForRange(dateRange2, allTransactions ?? []);

    const allDates: Date[] = [];
    if (dateRange1?.from) {
      allDates.push(...eachDayOfInterval({ start: dateRange1.from, end: dateRange1.to || dateRange1.from }));
    }
    if (dateRange2?.from) {
      allDates.push(...eachDayOfInterval({ start: dateRange2.from, end: dateRange2.to || dateRange2.from }));
    }
    const uniqueDates = [...new Set(allDates.map(d => format(d, 'yyyy-MM-dd')))].sort();

    const chartData = uniqueDates.map(dateStr => {
      const data1 = s1.dailyData.get(dateStr) || { income: 0, expenses: 0 };
      const data2 = s2.dailyData.get(dateStr) || { income: 0, expenses: 0 };
      return {
        date: format(new Date(dateStr), 'MMM d'),
        'Period 1 Income': data1.income,
        'Period 1 Expenses': data1.expenses,
        'Period 2 Income': data2.income,
        'Period 2 Expenses': data2.expenses,
      };
    });

    return { summary1: s1, summary2: s2, combinedChartData: chartData };
  }, [allTransactions, dateRange1, dateRange2]);
  
  const monthlySummary = useMemo(() => {
    return processTransactionsForRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }, allTransactions ?? []);
  }, [allTransactions]);

  async function handleAddEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available.' });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const type = formData.get('type') as 'income' | 'expense';
    const amount = parseFloat(formData.get('amount') as string);
    const description = formData.get('description') as string;
    const category = formData.get('category') as string;
    const date = entryDate || new Date();
    const clientName = formData.get('clientName') as string | undefined;
    const quantityStr = formData.get('quantity') as string | undefined;
    const quantity = quantityStr ? parseFloat(quantityStr) : undefined;

    if (isNaN(amount) || !description || !category) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill out all fields.' });
      return;
    }
    
     if (type === 'expense' && (!clientName || !quantity)) {
      toast({ variant: 'destructive', title: 'Validation Error', description: 'Client name and quantity are required for expenses.' });
      return;
    }

    try {
      const transactionsCollection = collection(firestore, 'financial_transactions');
      const newTransaction: Omit<FinancialTransaction, 'id'> = {
        type,
        amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
        description,
        category,
        date: Timestamp.fromDate(date),
        ...(clientName && { clientName }),
        ...(quantity && { quantity }),
      };

      await addDoc(transactionsCollection, newTransaction);
      
      setAddEntryDialogOpen(false);
      (event.target as HTMLFormElement).reset();
      toast({
        title: 'Transaction Added',
        description: `A new ${type} of $${Math.abs(amount)} has been recorded.`,
      });
    } catch (error: any) {
      console.error("Error adding transaction:", error);
      toast({
        variant: 'destructive',
        title: 'Error Adding Transaction',
        description: error.message || 'An unexpected error occurred.',
      });
    }
  }
  
  const handleGeneratePdf = () => {
    if (!dateRange1?.from) {
      toast({
        variant: "destructive",
        title: "No Data",
        description: "Please select at least one date range to generate a report.",
      });
      return;
    }
    
    const doc = new jsPDF();
    const title = 'Financial Comparison Report';
    
    doc.setFont('Playfair Display', 'bold');
    doc.setFontSize(22);
    doc.text(title, 14, 22);
    
    doc.setFont('PT Sans', 'normal');
    doc.setFontSize(11);
    doc.text(`For SK Traders`, 14, 30);
    doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, 36);

    let finalY = 45;

    const drawSummary = (periodName: string, summary: typeof summary1, range: DateRange) => {
        if(!range.from) return;
        doc.setFontSize(16);
        doc.setFont('Playfair Display', 'bold');
        doc.text(periodName, 14, finalY);
        finalY += 8;
        
        doc.setFont('PT Sans', 'normal');
        doc.setFontSize(11);
        doc.text(`Period: ${format(range.from, 'PPP')} - ${format(range.to || range.from, 'PPP')}`, 14, finalY);
        finalY += 8;

        doc.text(`Total Income: $${summary.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, finalY);
        finalY += 6;
        doc.text(`Total Expenses: $${summary.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, finalY);
        finalY += 8;
        
        doc.setFont('PT Sans', 'bold');
        doc.text(`Net Profit / Loss: $${summary.netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, finalY);
        finalY += 12;
    };

    drawSummary("Period 1 Summary", summary1, dateRange1);

    if (dateRange2?.from) {
        drawSummary("Period 2 Summary", summary2, dateRange2);
    }

    const allTransactionsForPdf = [...summary1.transactions, ...summary2.transactions];
    const uniqueTransactions = Array.from(new Map(allTransactionsForPdf.map(t => [t.id, t])).values())
      .sort((a, b) => a.date.toDate().getTime() - b.date.toDate().getTime());

    if(uniqueTransactions.length > 0) {
        const tableData = uniqueTransactions.map(t => [
            format(t.date.toDate(), 'yyyy-MM-dd'),
            t.description,
            t.category,
            t.type.charAt(0).toUpperCase() + t.type.slice(1),
            `$${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ]);

        autoTable(doc, {
            startY: finalY,
            head: [['Date', 'Description', 'Category/Product', 'Type', 'Amount']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [40, 50, 80] },
        });

        finalY = (doc as any).lastAutoTable.finalY || finalY;
    }

    doc.setFontSize(10);
    doc.text(`--- End of Report ---`, 14, finalY + 10);

    doc.save(`SKTraders-Finance-Comparison-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast({
      title: "PDF Report Generated",
      description: "Your report has been successfully downloaded.",
    });
  };


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
          <DialogContent className="sm:max-w-[425px]">
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
                
                 {entryType === 'expense' ? (
                  <Select name="category" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an expense category" />
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
                      <SelectValue placeholder="Select an income product" />
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

                {entryType === 'expense' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="clientName">Client Name</Label>
                       <Select name="clientName" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a client" />
                        </SelectTrigger>
                        <SelectContent>
                          {isClientsLoading ? <SelectItem value="loading" disabled>Loading...</SelectItem> :
                           clients?.map(c => <SelectItem key={c.id} value={c.companyName}>{c.companyName}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input id="quantity" name="quantity" type="number" placeholder="0" required />
                    </div>
                  </>
                )}

                <Input id="amount" name="amount" type="number" placeholder="Amount" required />
                <Input id="description" name="description" placeholder="Description" required />
                
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
              {isAllTransactionsLoading ? (
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
                  {isTodaysTransactionsLoading && <TableRow><TableCell colSpan={3}><Skeleton className="w-full h-8" /></TableCell></TableRow>}
                  {!isTodaysTransactionsLoading && todaysTransactions?.filter(t => t.type === 'income').map(t => (
                    <TableRow key={t.id}>
                        <TableCell>{t.description}</TableCell>
                        <TableCell>{t.category}</TableCell>
                        <TableCell className="text-right">${t.amount.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {!isTodaysTransactionsLoading && todaysTransactions?.filter(t => t.type === 'income').length === 0 && (
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
                    <TableHead className="hidden md:table-cell">Client</TableHead>
                    <TableHead className="hidden md:table-cell">Quantity</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {isTodaysTransactionsLoading && <TableRow><TableCell colSpan={5}><Skeleton className="w-full h-8" /></TableCell></TableRow>}
                   {!isTodaysTransactionsLoading && todaysTransactions?.filter(t => t.type === 'expense').map(t => (
                    <TableRow key={t.id}>
                        <TableCell>{t.description}</TableCell>
                        <TableCell>{t.category}</TableCell>
                        <TableCell className="hidden md:table-cell">{t.clientName || 'N/A'}</TableCell>
                        <TableCell className="hidden md:table-cell">{t.quantity?.toLocaleString() || 'N/A'}</TableCell>
                        <TableCell className="text-right">-${Math.abs(t.amount).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {!isTodaysTransactionsLoading && todaysTransactions?.filter(t => t.type === 'expense').length === 0 && (
                     <TableRow>
                      <TableCell colSpan={5} className="text-center">
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

              <div className="h-[350px]">
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
