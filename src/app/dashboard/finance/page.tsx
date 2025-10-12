'use client';

import { PlusCircle, Calendar as CalendarIcon, Filter, Wand2, Loader2, Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import React, { useState, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { transactions as initialTransactions } from '@/lib/data';
import type { Transaction } from '@/lib/types';
import { format, isToday, isThisMonth, isThisYear, startOfMonth, endOfMonth, startOfYear, endOfYear, sub, parseISO } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { DateRange } from 'react-day-picker';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

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

type FinancialTransaction = {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
  category: string;
};


export default function FinancePage() {
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<FinancialTransaction[]>(
    initialTransactions.map(t => ({
      id: t.id,
      type: t.type.toLowerCase() as 'income' | 'expense',
      amount: t.amount,
      description: t.clientName,
      date: t.date,
      category: t.product,
    }))
  );
  const [isAddEntryDialogOpen, setAddEntryDialogOpen] = useState(false);
  const [entryType, setEntryType] = useState('income');
  const [entryDate, setEntryDate] = useState<Date | undefined>(new Date());
  const [plFilter, setPlFilter] = useState('monthly');
  const [plDateRange, setPlDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  
  const chartContainerRef = useRef<HTMLDivElement>(null);


  const handleAddEntry = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const type = formData.get('type') as 'income' | 'expense';
    const amount = parseFloat(formData.get('amount') as string);
    const description = formData.get('description') as string;
    const category = (formData.get('category') || formData.get('product')) as string;
    
    const newTransaction: FinancialTransaction = {
      id: (transactions.length + 1).toString(),
      type,
      amount: type === 'expense' ? -Math.abs(amount) : Math.abs(amount),
      description,
      category,
      date: entryDate?.toISOString() ?? new Date().toISOString(),
    };

    setTransactions([...transactions, newTransaction]);
    setAddEntryDialogOpen(false);
    setEntryDate(new Date()); // Reset date for next entry
    toast({
      title: "Entry Added",
      description: `A new ${type} entry for $${Math.abs(amount)} has been recorded.`,
    });
  };

  const filteredTransactions = useMemo(() => {
    let startDate: Date;
    let endDate: Date;

    switch (plFilter) {
      case 'monthly':
        startDate = startOfMonth(new Date());
        endDate = endOfMonth(new Date());
        break;
      case 'yearly':
        startDate = startOfYear(new Date());
        endDate = endOfYear(new Date());
        break;
      case 'custom':
        if (!plDateRange?.from || !plDateRange?.to) {
          return [];
        }
        startDate = plDateRange.from;
        endDate = plDateRange.to;
        break;
      default:
        // By default, let's take the current month
        startDate = startOfMonth(new Date());
        endDate = endOfMonth(new Date());
        break;
    }
    
    endDate.setHours(23, 59, 59, 999);

    return transactions.filter(t => {
      const transactionDate = new Date(t.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });
  }, [transactions, plFilter, plDateRange]);

  const { totalIncome, totalExpenses, netProfit, chartData } = useMemo(() => {
    const incomeByDate: { [key: string]: number } = {};
    const expenseByDate: { [key: string]: number } = {};
    let totalIncome = 0;
    let totalExpenses = 0;

    filteredTransactions.forEach(t => {
      const date = format(new Date(t.date), 'yyyy-MM-dd');
      if (t.type === 'income') {
        incomeByDate[date] = (incomeByDate[date] || 0) + t.amount;
        totalIncome += t.amount;
      } else {
        expenseByDate[date] = (expenseByDate[date] || 0) + Math.abs(t.amount);
        totalExpenses += t.amount;
      }
    });

    const dates = [...new Set([...Object.keys(incomeByDate), ...Object.keys(expenseByDate)])].sort();
    const chartData = dates.map(date => ({
      date: format(new Date(date), 'MMM d'),
      income: incomeByDate[date] || 0,
      expenses: expenseByDate[date] || 0,
    }));

    return {
      totalIncome,
      totalExpenses: Math.abs(totalExpenses),
      netProfit: totalIncome + totalExpenses,
      chartData
    };
  }, [filteredTransactions]);

  const handleGeneratePdf = () => {
    const doc = new jsPDF();
    
    // Add header
    doc.setFont('Playfair Display', 'bold');
    doc.setFontSize(22);
    doc.text('HuskTrack Financial Report', 14, 22);
    doc.setFont('PT Sans', 'normal');
    doc.setFontSize(12);
    doc.text(`For SK Traders`, 14, 30);

    const dateRangeText = plDateRange?.from && plDateRange?.to 
      ? `Date Range: ${format(plDateRange.from, 'PPP')} - ${format(plDateRange.to, 'PPP')}`
      : `Date Range: ${plFilter.charAt(0).toUpperCase() + plFilter.slice(1)}`;
    doc.text(dateRangeText, 14, 36);

    const chartParent = chartContainerRef.current;
    if (chartParent) {
      const canvas = chartParent.querySelector('canvas');
      if (canvas) {
        try {
          const imgData = canvas.toDataURL('image/png');
          doc.addImage(imgData, 'PNG', 14, 45, 180, 80);
        } catch (error) {
          console.error("Error generating chart image:", error);
          toast({
            variant: 'destructive',
            title: 'Could not generate chart image',
            description: 'There was an issue capturing the chart for the PDF.',
          });
        }
      }
    }

    // Add table
    const tableData = filteredTransactions.map(t => {
        return [
          format(new Date(t.date), 'PP'),
          t.description,
          t.category,
          t.type === 'income' ? 'Income' : 'Expense',
          t.type === 'income' ? `$${t.amount.toLocaleString()}` : `-$${Math.abs(t.amount).toLocaleString()}`,
        ];
    });

    autoTable(doc, {
      startY: 135,
      head: [['Date', 'Description', 'Category/Product', 'Type', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [40, 50, 80] },
    });

    // Add summary
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(14);
    doc.text('Summary', 14, finalY);
    doc.setFontSize(12);
    doc.text(`Total Income: $${totalIncome.toLocaleString()}`, 14, finalY + 8);
    doc.text(`Total Expenses: -$${totalExpenses.toLocaleString()}`, 14, finalY + 16);
    doc.setFontSize(14);
    doc.setFont('PT Sans', 'bold');
    doc.text(`Net Profit: $${netProfit.toLocaleString()}`, 14, finalY + 24);

    doc.save(`HuskTrack-Financial-Report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

    toast({
        title: "PDF Generated",
        description: "Your financial report has been successfully downloaded.",
    });
  };
  
  const handleExportCsv = () => {
    if (filteredTransactions.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data to Export',
        description: 'There are no transactions in the selected period.',
      });
      return;
    }

    const headers = ['Date', 'Description', 'Category/Product', 'Type', 'Amount'];
    const csvRows = [
      headers.join(','),
      ...filteredTransactions.map(t => {
        const row = [
          format(new Date(t.date), 'yyyy-MM-dd'),
          `"${t.description.replace(/"/g, '""')}"`,
          `"${t.category.replace(/"/g, '""')}"`,
          t.type === 'income' ? 'Income' : 'Expense',
          t.amount,
        ];
        return row.join(',');
      }),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `HuskTrack-Export-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: 'CSV Exported',
      description: 'Your financial data has been successfully exported.',
    });
  };

  const todaysIncome = transactions.filter(t => isToday(new Date(t.date)) && t.type === 'income');
  const todaysExpenses = transactions.filter(t => isToday(new Date(t.date)) && t.type === 'expense');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline">Finance Management</h1>
        <div className="flex gap-2">
           <Button variant="outline" onClick={handleExportCsv}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export to CSV
          </Button>

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
                  <RadioGroup defaultValue="income" name="type" className="flex gap-4" onValueChange={setEntryType}>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="income" id="income" /><Label htmlFor="income">Income</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="expense" id="expense" /><Label htmlFor="expense">Expense</Label></div>
                  </RadioGroup>
                  <Input id="amount" name="amount" type="number" placeholder="Amount" required />
                  <Input id="description" name="description" placeholder="Description" required />
                  {entryType === 'expense' && (
                    <Select name="category" required><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger><SelectContent>{expenseCategories.map(c => <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>)}</SelectContent></Select>
                  )}
                  {entryType === 'income' && (
                     <Select name="product" required><SelectTrigger><SelectValue placeholder="Select a product" /></SelectTrigger><SelectContent>{incomeProducts.map(p => <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>)}</SelectContent></Select>
                  )}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-full justify-start text-left font-normal'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {entryDate ? format(entryDate, 'PPP') : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={entryDate}
                        onSelect={setEntryDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <DialogFooter><Button type="submit">Add Entry</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="profit-loss">Profit/Loss</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Card>
            <CardHeader><CardTitle>Financial Overview</CardTitle><CardDescription>A summary of your finances for this month.</CardDescription></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-lg">Total Income</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold text-green-600">${(transactions.filter(t => isThisMonth(new Date(t.date)) && t.type === 'income').reduce((acc, t) => acc + t.amount, 0)).toLocaleString()}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-lg">Total Expenses</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold text-red-600">-${(Math.abs(transactions.filter(t => isThisMonth(new Date(t.date)) && t.type === 'expense').reduce((acc, t) => acc + t.amount, 0))).toLocaleString()}</p></CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2"><CardTitle className="text-lg">Net Profit</CardTitle></CardHeader>
                    <CardContent><p className="text-3xl font-bold">${(transactions.filter(t => isThisMonth(new Date(t.date))).reduce((acc, t) => acc + t.amount, 0)).toLocaleString()}</p></CardContent>
                </Card>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="income">
          <Card>
            <CardHeader><CardTitle>Today's Income</CardTitle><CardDescription>Income transactions recorded today.</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Description</TableHead><TableHead>Product</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {todaysIncome.length > 0 ? todaysIncome.map(t => (
                    <TableRow key={t.id}><TableCell>{t.description}</TableCell><TableCell>{t.category}</TableCell><TableCell className="text-right">${t.amount.toLocaleString()}</TableCell></TableRow>
                  )) : <TableRow><TableCell colSpan={3} className="text-center">No income recorded today.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="expenses">
          <Card>
            <CardHeader><CardTitle>Today's Expenses</CardTitle><CardDescription>Expense transactions recorded today.</CardDescription></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Description</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {todaysExpenses.length > 0 ? todaysExpenses.map(t => (
                    <TableRow key={t.id}><TableCell>{t.description}</TableCell><TableCell>{t.category}</TableCell><TableCell className="text-right">-${Math.abs(t.amount).toLocaleString()}</TableCell></TableRow>
                  )) : <TableRow><TableCell colSpan={3} className="text-center">No expenses recorded today.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="profit-loss">
          <Card>
            <CardHeader>
              <CardTitle>Profit & Loss Statement</CardTitle>
              <div className="flex justify-between items-center">
                <CardDescription>Analyze your profit and loss over different periods.</CardDescription>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleGeneratePdf}><Download className="mr-2 h-4 w-4" /> Download PDF</Button>
                  <Button variant={plFilter === 'monthly' ? 'default' : 'outline'} size="sm" onClick={() => { setPlFilter('monthly'); setPlDateRange({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }); }}>Monthly</Button>
                  <Button variant={plFilter === 'yearly' ? 'default' : 'outline'} size="sm" onClick={() => { setPlFilter('yearly'); setPlDateRange({ from: startOfYear(new Date()), to: endOfYear(new Date()) }); }}>Yearly</Button>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant={plFilter === 'custom' ? 'default' : 'outline'} size="sm"><Filter className="mr-2 h-4 w-4" /> Custom</Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        initialFocus
                        mode="range"
                        defaultMonth={plDateRange?.from}
                        selected={plDateRange}
                        onSelect={(range) => { setPlDateRange(range); setPlFilter('custom'); }}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-green-50 dark:bg-green-900/20"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-green-700 dark:text-green-400">Total Income</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-green-600 dark:text-green-500">${totalIncome.toLocaleString()}</p></CardContent></Card>
                <Card className="bg-red-50 dark:bg-red-900/20"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-700 dark:text-red-400">Total Expenses</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold text-red-600 dark:text-red-500">-${totalExpenses.toLocaleString()}</p></CardContent></Card>
                <Card className={netProfit >= 0 ? "bg-blue-50 dark:bg-blue-900/20" : "bg-red-50 dark:bg-red-900/20"}><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-700 dark:text-blue-400">Net Profit</CardTitle></CardHeader><CardContent><p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-blue-600 dark:text-blue-500' : 'text-red-600 dark:text-red-500'}`}>${netProfit.toLocaleString()}</p></CardContent></Card>
              </div>
                <div ref={chartContainerRef} className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value / 1000}k`} />
                            <Tooltip
                                cursor={{ fill: 'hsl(var(--muted))' }}
                                contentStyle={{
                                    backgroundColor: 'hsl(var(--card))',
                                    borderColor: 'hsl(var(--border))',
                                    borderRadius: 'var(--radius)'
                                }}
                            />
                            <Legend iconSize={10} />
                            <Bar dataKey="income" fill="hsl(var(--chart-1))" name="Income" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expenses" fill="hsl(var(--chart-2))" name="Expenses" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Category/Product</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {filteredTransactions.length > 0 ? filteredTransactions.map(t => (
                    <TableRow key={t.id}>
                      <TableCell>{format(new Date(t.date), 'PP')}</TableCell>
                      <TableCell>{t.description}</TableCell>
                      <TableCell>{t.category}</TableCell>
                      <TableCell>{t.type === 'income' ? 'Income' : 'Expense'}</TableCell>
                      <TableCell className={`text-right font-medium ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{t.type === 'income' ? '+' : '-'}${Math.abs(t.amount).toLocaleString()}</TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={5} className="text-center">No transactions in this period.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
