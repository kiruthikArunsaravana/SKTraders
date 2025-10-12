'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
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
import { getTransactionsForDateRange } from '@/app/dashboard/reports/actions';
import type { FinancialTransaction } from '@/lib/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const reportSchema = z.object({
  reportTitle: z.string().min(5, {
    message: 'Title must be at least 5 characters.',
  }),
  dateRange: z.object({
    from: z.date({ required_error: 'A start date is required.' }),
    to: z.date({ required_error: 'An end date is required.' }),
  }),
});

type ChartData = {
  name: string;
  income: number;
  expenses: number;
}

type PdfGenerationData = {
  title: string;
  dateRange: { from: Date; to: Date };
  transactions: FinancialTransaction[];
  chartData: ChartData[];
};

export default function ReportGenerator() {
  const { toast } = useToast();
  const [isPending, setPending] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reportTitle: 'Monthly Financial Summary',
    },
  });

  const generatePdf = async (data: PdfGenerationData) => {
    const { title, dateRange, transactions } = data;
    
    // Add a small delay to ensure the chart has rendered
    await new Promise(resolve => setTimeout(resolve, 500));

    const doc = new jsPDF();

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netProfit = totalIncome + totalExpenses;

    // Header
    doc.setFont('Playfair Display', 'bold');
    doc.setFontSize(22);
    doc.text(title, 14, 22);
    
    doc.setFont('PT Sans', 'normal');
    doc.setFontSize(11);
    doc.text(`For SK Traders`, 14, 30);
    doc.text(`Date Range: ${format(dateRange.from, 'PPP')} - ${format(dateRange.to, 'PPP')}`, 14, 36);
    doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, 42);

    // Summary
    doc.setFontSize(16);
    doc.setFont('Playfair Display', 'bold');
    doc.text('Summary', 14, 60);

    doc.setFont('PT Sans', 'normal');
    doc.setFontSize(12);
    doc.text(`Total Income: $${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, 70);
    doc.text(`Total Expenses: $${Math.abs(totalExpenses).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, 76);
    
    doc.setFont('PT Sans', 'bold');
    doc.text(`Net Profit / Loss: $${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, 84);

    // Chart
    doc.setFontSize(16);
    doc.setFont('Playfair Display', 'bold');
    doc.text('Performance by Product', 14, 100);

    const chartParent = chartContainerRef.current;
    if (chartParent) {
      const canvas = chartParent.querySelector('canvas');
      if (canvas) {
        try {
          const imgData = canvas.toDataURL('image/png', 1.0);
          doc.addImage(imgData, 'PNG', 14, 105, 180, 80);
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
    
    const tableStartY = 195;

    // Transactions Table
    const tableData = transactions.map(t => [
      format(new Date(t.date), 'yyyy-MM-dd'),
      t.description,
      t.category,
      t.type.charAt(0).toUpperCase() + t.type.slice(1),
      `$${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: tableStartY,
      head: [['Date', 'Description', 'Category/Product', 'Type', 'Amount']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [40, 50, 80] },
    });

    const finalY = (doc as any).lastAutoTable.finalY || 10;
    doc.setFontSize(10);
    doc.text(`--- End of Report ---`, 14, finalY + 10);


    doc.save(`${title.replace(/ /g, '_')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast({
      title: "PDF Report Generated",
      description: "Your report has been successfully downloaded.",
    });
    setPending(false);
  };

  async function onSubmit(values: z.infer<typeof reportSchema>) {
    setPending(true);
    try {
      const transactions = await getTransactionsForDateRange(values.dateRange);
      
      if (transactions.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No Data Found',
          description: 'There are no transactions in the selected date range to generate a report.',
        });
        setPending(false);
        return;
      }
      
      const productData: { [key: string]: { income: number; expenses: number } } = {};
      transactions.forEach(t => {
        if (!productData[t.category]) {
          productData[t.category] = { income: 0, expenses: 0 };
        }
        if (t.type === 'income') {
          productData[t.category].income += t.amount;
        } else {
          productData[t.category].expenses += Math.abs(t.amount);
        }
      });
      
      const newChartData = Object.keys(productData).map(key => ({
        name: key,
        income: productData[key].income,
        expenses: productData[key].expenses,
      }));

      // Directly call the async pdf generation function
      await generatePdf({
        title: values.reportTitle,
        dateRange: values.dateRange,
        transactions,
        chartData: newChartData,
      });

    } catch (error) {
      console.error("Failed to generate report:", error);
      toast({
        variant: 'destructive',
        title: 'Error Generating Report',
        description: 'An unexpected error occurred. Please try again.',
      });
      setPending(false);
    }
  }


  return (
    <>
    {/* This container remains hidden and is used to render the chart for PDF capture */}
    <div style={{ position: 'absolute', left: '-9999px', top: '-9999px', width: '800px', height: '400px' }}>
      <div ref={chartContainerRef} style={{width: '100%', height: '100%'}}>
          <ResponsiveContainer width="100%" height="100%">
              <BarChart data={form.getValues('dateRange') ? [] : []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="income" fill="hsl(var(--chart-1))" name="Income" />
                  <Bar dataKey="expenses" fill="hsl(var(--chart-2))" name="Expenses" />
              </BarChart>
          </ResponsiveContainer>
      </div>
    </div>

    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Generate Financial Report</CardTitle>
            <CardDescription>
              Select a date range and provide a title for your PDF report. The report will include a summary, a product performance chart, and a detailed transaction list.
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
          <CardFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Generate PDF
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
    </>
  );
}
