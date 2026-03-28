'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, isWithinInterval, isValid, startOfMonth, endOfMonth } from 'date-fns';
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
import type { FinancialTransaction, Export, LocalSale, CoconutPurchase, CoconutWorkerEntry } from '@/lib/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, Timestamp } from '@/firebase/firestore';
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
  coconutPurchases: CoconutPurchase[];
  coconutWorkerEntries: CoconutWorkerEntry[];
  products: Array<{ id: string; name: string }>;
};

function isOperationalLedgerTransaction(transaction: FinancialTransaction) {
  const description = transaction.description || '';

  return (
    description.startsWith('Export order of ') ||
    description.startsWith('Local sale of ') ||
    description.startsWith('Paid for purchase of ') ||
    description.startsWith('Worker payment for coconut processing week of ')
  );
}

function normalizeToDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  if (value instanceof Timestamp) {
    const d = value.toDate();
    return isValid(d) ? d : null;
  }
  if (typeof value?.toDate === 'function') {
    const d = value.toDate();
    return d instanceof Date && isValid(d) ? d : null;
  }
  const parsed = new Date(value);
  return isValid(parsed) ? parsed : null;
}

export default function ReportGenerator() {
  const { toast } = useToast();
  const [isPdfPending, setPdfPending] = useState(false);
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reportTitle: 'Monthly Financial Summary',
      dateRange: {
        from: startOfMonth(new Date()),
        to: endOfMonth(new Date()),
      },
    },
  });

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'financial_transactions'), orderBy('date', 'desc'));
  }, [firestore]);

  const exportsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'exports'), orderBy('date', 'desc'));
  }, [firestore]);

  const localSalesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'local_sales'), orderBy('date', 'desc'));
  }, [firestore]);

  const coconutPurchasesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'coconut_purchases'), orderBy('date', 'desc'));
  }, [firestore]);

  const coconutWorkerQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'coconut-worker'), orderBy('weekStart', 'desc'));
  }, [firestore]);

  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'products'), orderBy('name', 'asc'));
  }, [firestore]);

  const { data: allTransactions, isLoading: isLoadingTransactions } = useCollection<FinancialTransaction>(transactionsQuery);
  const { data: allExports, isLoading: isLoadingExports } = useCollection<Export>(exportsQuery);
  const { data: allLocalSales, isLoading: isLoadingLocalSales } = useCollection<LocalSale>(localSalesQuery);
  const { data: allCoconutPurchases, isLoading: isLoadingCoconutPurchases } = useCollection<CoconutPurchase>(coconutPurchasesQuery);
  const { data: allCoconutWorkerEntries, isLoading: isLoadingCoconutWorkerEntries } = useCollection<CoconutWorkerEntry>(coconutWorkerQuery);
  const { data: allProducts, isLoading: isLoadingProducts } = useCollection<{ id: string; name: string }>(productsQuery);

  const generatePdf = async (data: PdfGenerationData) => {
    setPdfPending(true);
    const { title, dateRange, transactions, exports, localSales, coconutPurchases, coconutWorkerEntries, products } = data;

    if (transactions.length === 0 && exports.length === 0 && localSales.length === 0 && coconutPurchases.length === 0 && coconutWorkerEntries.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Data Found',
        description: 'There is no data in the selected date range to generate a report.',
      });
      setPdfPending(false);
      return;
    }

    const doc = new jsPDF();
    const productsMap = new Map<string, { id: string; name: string }>([
      ...initialProducts.map((p) => [p.id, { id: p.id, name: p.name }] as const),
      ...products.map((p) => [p.id, p] as const),
    ]);

    const pendingExports = exports.filter(e => e.paymentStatus === 'Pending');
    const pendingLocalSales = localSales.filter(s => s.paymentStatus === 'Pending');

    const otherLedgerTransactions = transactions.filter((transaction) => !isOperationalLedgerTransaction(transaction));

    const totalExportAmount = exports.reduce((sum, exp) => sum + exp.quantity * exp.price, 0);
    const totalPaidExportAmount = exports
      .filter((exp) => exp.paymentStatus === 'Paid')
      .reduce((sum, exp) => sum + exp.quantity * exp.price, 0);
    const totalLocalSalesAmount = localSales.reduce((sum, sale) => sum + sale.quantity * sale.price, 0);
    const totalPaidLocalSalesAmount = localSales
      .filter((sale) => sale.paymentStatus === 'Paid')
      .reduce((sum, sale) => sum + sale.quantity * sale.price, 0);
    const totalCoconutPurchaseAmount = coconutPurchases.reduce((sum, purchase) => sum + purchase.quantity * purchase.price, 0);
    const totalPaidCoconutPurchaseAmount = coconutPurchases.filter((purchase) => purchase.paymentStatus === 'Paid').reduce((sum, purchase) => sum + purchase.quantity * purchase.price, 0);
    const totalCoconutProcessed = coconutWorkerEntries.reduce((sum, entry) => sum + entry.processedCoconuts, 0);
    const totalWorkerCost = coconutWorkerEntries.reduce((sum, entry) => sum + entry.totalWorkerCost, 0);
    const totalWorkerPaid = coconutWorkerEntries.reduce((sum, entry) => sum + entry.paidToWorker, 0);
    const totalWorkerBalance = coconutWorkerEntries.reduce((sum, entry) => sum + (entry.totalWorkerCost - entry.paidToWorker), 0);
    const totalOtherIncome = otherLedgerTransactions
      .filter((transaction) => transaction.type === 'income')
      .reduce((sum, transaction) => sum + transaction.amount, 0);
    const totalOtherExpenses = otherLedgerTransactions
      .filter((transaction) => transaction.type === 'expense')
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);
    const totalIncome = totalPaidExportAmount + totalPaidLocalSalesAmount + totalOtherIncome;
    const totalExpenses = totalPaidCoconutPurchaseAmount + totalWorkerPaid + totalOtherExpenses;
    const netProfit = totalIncome - totalExpenses;

    const totalCoconutPurchasedAmount = totalPaidCoconutPurchaseAmount;

    const totalRawHuskPurchasedAmount = transactions
      .filter(t => t.type === 'expense' && t.category === 'Husk')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const productSales: { [key: string]: number } = {};
    [...localSales, ...exports].forEach(sale => {
        const productName = productsMap.get(sale.productId)?.name || 'Unknown Product';
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
        ['Total Income (Ledger)', `$${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Total Expenses', `$${totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Net Profit / Loss', `$${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Total Export Value (All Statuses)', `$${totalExportAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Paid Export Value', `$${totalPaidExportAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Total Local Sales Value (All Statuses)', `$${totalLocalSalesAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Paid Local Sales Value', `$${totalPaidLocalSalesAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Paid Coconut Purchase Expense', `$${totalCoconutPurchasedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Worker Paid Expense', `$${totalWorkerPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Other Ledger Expenses', `$${totalOtherExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Raw Husk Purchased', `$${totalRawHuskPurchasedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Other Ledger Income', `$${totalOtherIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
        ['Expense Formula Check', 'Paid Coconut + Worker Paid + Other Ledger'],
    ];

    autoTable(doc, {
        startY: finalY,
        head: [['Summary Metric', 'Amount']],
        body: summaryData,
        theme: 'grid',
        headStyles: { fillColor: [40, 50, 80] },
    });
    
    finalY = (doc as any).lastAutoTable.finalY + 10;

    if (coconutPurchases.length > 0 || coconutWorkerEntries.length > 0) {
      doc.setFontSize(16);
      doc.setFont('Playfair Display', 'bold');
      doc.text('Coconut And Worker Breakdown', 14, finalY);
      finalY += 8;

      autoTable(doc, {
        startY: finalY,
        head: [[
          'Coconut Purchase Value',
          'Paid Coconut Purchase',
          'Coconut Processed',
          'Worker Total Cost',
          'Worker Paid',
          'Worker Balance',
        ]],
        body: [[
          `$${totalCoconutPurchaseAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `$${totalPaidCoconutPurchaseAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          totalCoconutProcessed.toLocaleString(),
          `$${totalWorkerCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `$${totalWorkerPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `$${totalWorkerBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        ]],
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [60, 90, 70], fontSize: 8 },
      });

      finalY = (doc as any).lastAutoTable.finalY + 10;
    }
    
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

    const pendingPaymentsSummary = Array.from(
      pendingPaymentsData.reduce((map, item) => {
        const key = `${item.type}::${item.client}`;
        const current = map.get(key) || { client: item.client, type: item.type, amount: 0, count: 0 };
        current.amount += item.amount;
        current.count += 1;
        map.set(key, current);
        return map;
      }, new Map<string, { client: string; type: string; amount: number; count: number }>())
      .values()
    );

    if (pendingPaymentsSummary.length > 0) {
      doc.setFontSize(16);
      doc.setFont('Playfair Display', 'bold');
      doc.text('Pending Payments (Accounts Receivable)', 14, finalY);
      finalY += 8;

      const pendingTableData = pendingPaymentsSummary.map(p => [
        p.client,
        p.type,
        String(p.count),
        `$${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);

      autoTable(doc, {
        startY: finalY,
        head: [['Client Name', 'Sale Type', 'Invoices', 'Amount Due']],
        body: pendingTableData,
        theme: 'grid',
        headStyles: { fillColor: [200, 100, 100] },
      });
      finalY = (doc as any).lastAutoTable.finalY + 10;
    }

    if (exports.length > 0) {
      doc.setFontSize(16);
      doc.setFont('Playfair Display', 'bold');
      doc.text('Detailed Export Orders', 14, finalY);
      finalY += 8;

      const exportTableData = exports.map(exp => {
        const productName = productsMap.get(exp.productId)?.name || 'Unknown Product';
        const parsedDate = normalizeToDate(exp.date);
        return [
          exp.clientName,
          exp.invoiceNumber,
          productName,
          exp.destinationCountry,
          exp.destinationPort,
          parsedDate ? format(parsedDate, 'yyyy-MM-dd') : 'N/A',
          exp.status,
          exp.paymentStatus,
          exp.quantity.toLocaleString(),
          `$${exp.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `$${(exp.quantity * exp.price).toLocaleString()}`,
        ];
      });

      autoTable(doc, {
        startY: finalY,
        head: [[
          'Client',
          'Invoice',
          'Product',
          'Country',
          'Port',
          'Date',
          'Status',
          'Payment',
          'Qty',
          'Unit Price',
          'Total Value',
        ]],
        body: exportTableData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [40, 50, 80], fontSize: 8 },
      });

      finalY = (doc as any).lastAutoTable.finalY + 10;
    }

    if (localSales.length > 0) {
      doc.setFontSize(16);
      doc.setFont('Playfair Display', 'bold');
      doc.text('Detailed Local Sales', 14, finalY);
      finalY += 8;

      const localSalesTableData = localSales.map(sale => {
        const productName = productsMap.get(sale.productId)?.name || 'Unknown Product';
        const parsedDate = normalizeToDate(sale.date);
        return [
          sale.clientName,
          sale.invoiceNumber,
          productName,
          parsedDate ? format(parsedDate, 'yyyy-MM-dd') : 'N/A',
          sale.status,
          sale.paymentStatus,
          sale.quantity.toLocaleString(),
          `$${sale.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `$${(sale.quantity * sale.price).toLocaleString()}`,
        ];
      });

      autoTable(doc, {
        startY: finalY,
        head: [[
          'Client',
          'Invoice',
          'Product',
          'Date',
          'Status',
          'Payment',
          'Qty',
          'Unit Price',
          'Total Value',
        ]],
        body: localSalesTableData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [40, 50, 80], fontSize: 8 },
      });

      finalY = (doc as any).lastAutoTable.finalY + 10;
    }

    if (coconutPurchases.length > 0) {
      doc.setFontSize(16);
      doc.setFont('Playfair Display', 'bold');
      doc.text('Detailed Coconut Purchases', 14, finalY);
      finalY += 8;

      const coconutPurchaseTableData = coconutPurchases.map((purchase) => {
        const parsedDate = normalizeToDate(purchase.date);
        return [
          purchase.clientName,
          parsedDate ? format(parsedDate, 'yyyy-MM-dd') : 'N/A',
          purchase.paymentStatus,
          purchase.quantity.toLocaleString(),
          `$${purchase.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `$${(purchase.quantity * purchase.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        ];
      });

      autoTable(doc, {
        startY: finalY,
        head: [[
          'Supplier',
          'Date',
          'Payment',
          'Qty',
          'Unit Price',
          'Total Value',
        ]],
        body: coconutPurchaseTableData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [40, 50, 80], fontSize: 8 },
      });

      finalY = (doc as any).lastAutoTable.finalY + 10;
    }

    if (coconutWorkerEntries.length > 0) {
      doc.setFontSize(16);
      doc.setFont('Playfair Display', 'bold');
      doc.text('Detailed Coconut Worker Report', 14, finalY);
      finalY += 8;

      const coconutWorkerTableData = coconutWorkerEntries.map((entry) => {
        const parsedWeekStart = normalizeToDate(entry.weekStart);
        return [
          parsedWeekStart ? format(parsedWeekStart, 'yyyy-MM-dd') : 'N/A',
          entry.processedCoconuts.toLocaleString(),
          `$${entry.totalWorkerCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `$${entry.paidToWorker.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `$${(entry.totalWorkerCost - entry.paidToWorker).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        ];
      });

      autoTable(doc, {
        startY: finalY,
        head: [[
          'Week Start',
          'Processed',
          'Total Cost',
          'Amount Given',
          'Balance',
        ]],
        body: coconutWorkerTableData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [40, 50, 80], fontSize: 8 },
      });

      finalY = (doc as any).lastAutoTable.finalY + 10;
    }


    if (otherLedgerTransactions.length > 0) {
        doc.setFontSize(16);
        doc.setFont('Playfair Display', 'bold');
        doc.text('Detailed Other Ledger Transactions', 14, finalY);
        finalY += 8;

        const tableData = otherLedgerTransactions.map(t => {
          const parsedDate = normalizeToDate(t.date);

          return [
            parsedDate ? format(parsedDate, 'yyyy-MM-dd') : 'N/A',
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
    
    const loading = isLoadingTransactions || isLoadingExports || isLoadingLocalSales || isLoadingCoconutPurchases || isLoadingCoconutWorkerEntries || isLoadingProducts;
    const dataUnavailable = !allTransactions || !allExports || !allLocalSales || !allCoconutPurchases || !allCoconutWorkerEntries || !allProducts;

    if (loading || dataUnavailable) {
       toast({
        variant: 'destructive',
        title: 'Data not loaded',
        description: 'Data is still loading, please try again in a moment.',
      });
      setPdfPending(false);
      return;
    }
    
    const dateFilter = (item: { date: Timestamp }) => {
        if (!item?.date) return false;
        
        const transactionDate = normalizeToDate(item.date);
        if (!transactionDate) return false;
        const fromDate = values.dateRange.from;
        const toDate = values.dateRange.to ? new Date(values.dateRange.to) : new Date(fromDate);
        toDate.setHours(23, 59, 59, 999); // Set to end of day
        
        return isWithinInterval(transactionDate, { start: fromDate, end: toDate });
    }

    const filteredTransactions = allTransactions.filter(dateFilter);
    const filteredExports = allExports.filter(dateFilter);
    const filteredLocalSales = allLocalSales.filter(dateFilter);
    const filteredCoconutPurchases = allCoconutPurchases.filter(dateFilter);
    const filteredCoconutWorkerEntries = allCoconutWorkerEntries.filter((item) => {
      const transactionDate = normalizeToDate(item.weekStart);
      if (!transactionDate) return false;
      const fromDate = values.dateRange.from;
      const toDate = values.dateRange.to ? new Date(values.dateRange.to) : new Date(fromDate);
      toDate.setHours(23, 59, 59, 999);
      return isWithinInterval(transactionDate, { start: fromDate, end: toDate });
    });
    
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
      coconutPurchases: filteredCoconutPurchases,
      coconutWorkerEntries: filteredCoconutWorkerEntries,
      products: allProducts,
    });
    
    setPdfPending(false);
  }

  const isLoading = isLoadingTransactions || isLoadingExports || isLoadingLocalSales || isLoadingCoconutPurchases || isLoadingCoconutWorkerEntries || isLoadingProducts;

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
