'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, isWithinInterval } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import type { FinancialTransaction, Export, LocalSale, Product } from '@/lib/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { initialProducts } from '@/lib/data';


const reportSchema = z.object({
  reportTitle: z.string().min(5, {
    message: 'Title must be at least 5 characters.',
  }),
  dateRange: z.object({
    from: z.date({ required_error: 'A start date is required.' }),
    to: z.date().optional(),
  }),
});

type PdfGenerationData = {
  title: string;
  dateRange: { from: Date; to: Date };
  transactions: FinancialTransaction[];
  exports: Export[];
  localSales: LocalSale[];
};

export default function ReportGenerator() {
  const { toast } = useToast();
  const [isPdfPending, setPdfPending] = useState(false);
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reportTitle: 'Monthly Financial Summary',
    },
  });

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'financial_transactions'), orderBy('date', 'desc'));
  }, [firestore]);

  const exportsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'exports'), orderBy('exportDate', 'desc'));
  }, [firestore]);

  const localSalesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'local_sales'), orderBy('saleDate', 'desc'));
  }, [firestore]);

  const { data: allTransactions, isLoading: isLoadingTransactions } = useCollection<FinancialTransaction>(transactionsQuery);
  const { data: allExports, isLoading: isLoadingExports } = useCollection<Export>(exportsQuery);
  const { data: allLocalSales, isLoading: isLoadingLocalSales } = useCollection<LocalSale>(localSalesQuery);

  const generatePdf = async (data: PdfGenerationData) => {
    setPdfPending(true);
    const { title, dateRange, transactions, exports, localSales } = data;

    if (transactions.length === 0 && exports.length === 0 && localSales.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data Found',
        description: 'There is no data in the selected date range to generate a report.',
      });
      setPdfPending(false);
      return;
    }

    const doc = new jsPDF();
    const productsMap = new Map<string, Product>(initialProducts.map(p => [p.id, p]));

    const paidExports = exports.filter(e => e.paymentStatus === 'Paid');
    const paidLocalSales = localSales.filter(s => s.paymentStatus === 'Paid');
    const pendingExports = exports.filter(e => e.paymentStatus === 'Pending');
    const pendingLocalSales = localSales.filter(s => s.paymentStatus === 'Pending');

    const totalIncomeFromClients = paidExports.reduce((sum, exp) => sum + (exp.quantity * exp.price), 0) +
                                   paidLocalSales.reduce((sum, sale) => sum + (sale.quantity * sale.price), 0);

    const totalOtherIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = totalIncomeFromClients + totalOtherIncome;

    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const netProfit = totalIncome - totalExpenses;

    const totalExportAmount = exports.reduce((sum, exp) => sum + (exp.quantity * exp.price), 0);
    const totalLocalSalesAmount = localSales.reduce((sum, sale) => sum + (sale.quantity * sale.price), 0);
    
    const totalStockCreated = transactions
      .filter(t => t.type === 'expense' && t.category === 'Husk')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const productSales: { [key: string]: number } = {};
    [...localSales, ...exports].forEach(sale => {
        const productName = productsMap.get(sale.productId as 'coco-pith' | 'coir-fiber' | 'husk-chips')?.name || 'Unknown Product';
        productSales[productName] = (productSales[productName] || 0) + sale.quantity;
    });


    doc.setFont('Playfair Display', 'bold');
    doc.setFontSize(22);
    doc.text(title, 14, 22);
    
    doc.setFont('PT Sans', 'normal');
    doc.setFontSize(11);
    doc.text(`For SK Traders`, 14, 30);
    doc.text(`Date Range: ${format(dateRange.from, 'PPP')} - ${format(dateRange.to, 'PPP')}`, 14, 42);
    doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, 36);


    let finalY = 50;
    
    doc.setFontSize(16);
    doc.setFont('Playfair Display', 'bold');
    doc.text('Overall Summary', 14, finalY);
    finalY += 8;

    const summaryData = [
        ['Total Income (from paid sales)', `$${totalIncomeFromClients.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Total Other Income', `$${totalOtherIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Total Expenses', `$${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Net Profit / Loss', `$${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Total Export Value (Paid & Pending)', `$${totalExportAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Total Local Sales Value (Paid & Pending)', `$${totalLocalSalesAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Total Raw Husk Purchased', `$${totalStockCreated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
    ];

    autoTable(doc, {
        startY: finalY,
        head: [['Summary Metric', 'Amount']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [40, 50, 80] },
    });
    
    finalY = (doc as any).lastAutoTable.finalY + 10;
    
    // Products Sold Table
    if (Object.keys(productSales).length > 0) {
        doc.setFontSize(16);
        doc.setFont('Playfair Display', 'bold');
        doc.text('Products Sold Summary', 14, finalY);
        finalY += 8;

        const productSalesTableData = Object.entries(productSales).map(([name, quantity]) => [
            name,
            quantity.toLocaleString()
        ]);

        autoTable(doc, {
            startY: finalY,
            head: [['Product Name', 'Total Quantity Sold']],
            body: productSalesTableData,
            theme: 'grid',
            headStyles: { fillColor: [40, 50, 80] },
        });

        finalY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Pending Payments
    const pendingPaymentsData = [
        ...pendingExports.map(e => ({ client: e.clientName, amount: e.quantity * e.price, type: 'Export' })),
        ...pendingLocalSales.map(s => ({ client: s.clientName, amount: s.quantity * s.price, type: 'Local' }))
    ];

    if (pendingPaymentsData.length > 0) {
      doc.setFontSize(16);
      doc.setFont('Playfair Display', 'bold');
      doc.text('Pending Payments (Accounts Receivable)', 14, finalY);
      finalY += 8;

      const pendingTableData = pendingPaymentsData.map(p => [
        p.client,
        p.type,
        `$${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);

      autoTable(doc, {
        startY: finalY,
        head: [['Client Name', 'Sale Type', 'Amount Due']],
        body: pendingTableData,
        theme: 'grid',
        headStyles: { fillColor: [200, 100, 100] },
      });
      finalY = (doc as any).lastAutoTable.finalY + 10;
    }


    if(transactions.length > 0) {
        doc.setFontSize(16);
        doc.setFont('Playfair Display', 'bold');
        doc.text('Detailed Other Transactions', 14, finalY);
        finalY += 8;

        const tableData = transactions.map(t => {
          return [
            format(t.date instanceof Timestamp ? t.date.toDate() : t.date, 'yyyy-MM-dd'),
            t.description,
            t.category,
            t.type.charAt(0).toUpperCase() + t.type.slice(1),
            `$${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          ];
        });

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

    doc.save(`${title.replace(/ /g, '_')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast({
      title: "PDF Report Generated",
      description: "Your report has been successfully downloaded.",
    });
    setPdfPending(false);
  };

  async function onSubmit(values: z.infer<typeof reportSchema>) {
    setPdfPending(true);
    
    const loading = isLoadingTransactions || isLoadingExports || isLoadingLocalSales;
    const dataUnavailable = !allTransactions || !allExports || !allLocalSales;

    if (loading || dataUnavailable) {
       toast({
        variant: 'destructive',
        title: 'Data not loaded',
        description: 'Data is still loading, please try again in a moment.',
      });
      setPdfPending(false);
      return;
    }
    
    const dateFilter = (item: { date?: Timestamp, exportDate?: Timestamp, saleDate?: Timestamp }) => {
        const itemDate = item.date || item.exportDate || item.saleDate;
        if (!itemDate) return false;
        
        const transactionDate = itemDate.toDate();
        const fromDate = values.dateRange.from;
        const toDate = values.dateRange.to ? new Date(values.dateRange.to) : new Date(fromDate);
        toDate.setHours(23, 59, 59, 999); // Set to end of day
        
        return isWithinInterval(transactionDate, { start: fromDate, end: toDate });
    }

    const filteredTransactions = allTransactions.filter(dateFilter);
    const filteredExports = allExports.filter(dateFilter);
    const filteredLocalSales = allLocalSales.filter(dateFilter);
    
    const finalDateRange = {
        from: values.dateRange.from,
        to: values.dateRange.to || values.dateRange.from
    };

    await generatePdf({
      title: values.reportTitle,
      dateRange: finalDateRange,
      transactions: filteredTransactions,
      exports: filteredExports,
      localSales: filteredLocalSales,
    });
    
    setPdfPending(false);
  }

  const isLoading = isLoadingTransactions || isLoadingExports || isLoadingLocalSales;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Generate Comprehensive Report</CardTitle>
            <CardDescription>
              Select a date range to generate a PDF report with a full business summary.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="dateRange"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date range</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={'outline'}
                          className={cn(
                            'w-full justify-start text-left font-normal md:w-1/2',
                            !field.value?.from && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value?.from ? (
                            field.value.to ? (
                              <>
                                {format(field.value.from, 'LLL dd, y')} -{' '}
                                {format(field.value.to, 'LLL dd, y')}
                              </>
                            ) : (
                              format(field.value.from, 'LLL dd, y')
                            )
                          ) : (
                            <span>Pick a date range</span>
                          )}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        selected={{ from: field.value?.from, to: field.value?.to }}
                        onSelect={field.onChange}
                        numberOfMonths={2}
                        disabled={(date) => date > new Date() || date < new Date("2000-01-01")}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="reportTitle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Report Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Q4 Financial Summary"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This will be the title of the generated PDF document.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="gap-2">
            <Button type="submit" disabled={isPdfPending || isLoading}>
              {isPdfPending || isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Generate PDF Report
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
