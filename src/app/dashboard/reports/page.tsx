'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, Download, Bot } from 'lucide-react';
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
import type { FinancialTransaction } from '@/lib/types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '@/hooks/use-toast';
import { generateReport } from '@/ai/flows/generate-report';
import { Textarea } from '../ui/textarea';
import { useFirestore } from '@/firebase';
import { collection, getDocs, query, where, Timestamp } from 'firebase/firestore';


const reportSchema = z.object({
  reportTitle: z.string().min(5, {
    message: 'Title must be at least 5 characters.',
  }),
  dateRange: z.object({
    from: z.date({ required_error: 'A start date is required.' }),
    to: z.date({ required_error: 'An end date is required.' }),
  }),
  analysisRequest: z.string().optional(),
});

type PdfGenerationData = {
  title: string;
  dateRange: { from: Date; to: Date };
  transactions: FinancialTransaction[];
  analysis?: string;
};

export default function ReportGenerator() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isPdfPending, setPdfPending] = useState(false);
  const [isAiPending, setAiPending] = useState(false);
  const [generatedAnalysis, setGeneratedAnalysis] = useState<string | null>(null);

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reportTitle: 'Monthly Financial Summary',
      analysisRequest: 'Provide a brief summary of income vs expenses and point out the highest expense category.',
    },
  });

  async function getTransactionsForDateRange(dateRange: {
    from: Date;
    to: Date;
  }): Promise<FinancialTransaction[]> {
    const { from, to } = dateRange;
    to.setHours(23, 59, 59, 999); // Ensure the end of the day is included
    
    const transactionsRef = collection(firestore, 'financial_transactions');
    const q = query(transactionsRef,
      where('date', '>=', Timestamp.fromDate(from)),
      where('date', '<=', Timestamp.fromDate(to))
    );
  
    try {
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as FinancialTransaction[];
    } catch (error) {
      console.error("Firestore Error (getTransactionsForDateRange):", error);
      toast({ variant: 'destructive', title: 'Error fetching data', description: 'Could not retrieve transactions from the database.' });
      return [];
    }
  }


  const generatePdf = async (data: PdfGenerationData) => {
    setPdfPending(true);
    const { title, dateRange, transactions, analysis } = data;
    
    const doc = new jsPDF();

    const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    const netProfit = totalIncome + totalExpenses;

    doc.setFont('Playfair Display', 'bold');
    doc.setFontSize(22);
    doc.text(title, 14, 22);
    
    doc.setFont('PT Sans', 'normal');
    doc.setFontSize(11);
    doc.text(`For SK Traders`, 14, 30);
    doc.text(`Date Range: ${format(dateRange.from, 'PPP')} - ${format(dateRange.to, 'PPP')}`, 14, 36);
    doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, 42);

    let finalY = 50;

    if (analysis) {
        doc.setFontSize(16);
        doc.setFont('Playfair Display', 'bold');
        doc.text('AI-Generated Analysis', 14, finalY);
        finalY += 10;
        doc.setFont('PT Sans', 'normal');
        doc.setFontSize(11);
        const splitText = doc.splitTextToSize(analysis, 180);
        doc.text(splitText, 14, finalY);
        finalY += (splitText.length * 5) + 10;
    }
    
    doc.setFontSize(16);
    doc.setFont('Playfair Display', 'bold');
    doc.text('Financial Summary', 14, finalY);
    finalY += 10;

    doc.setFont('PT Sans', 'normal');
    doc.setFontSize(12);
    doc.text(`Total Income: $${totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, finalY);
    finalY += 6;
    doc.text(`Total Expenses: $${Math.abs(totalExpenses).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, finalY);
    finalY += 8;
    
    doc.setFont('PT Sans', 'bold');
    doc.text(`Net Profit / Loss: $${netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, finalY);
    finalY += 12;

    const tableData = transactions.map(t => [
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
    doc.setFontSize(10);
    doc.text(`--- End of Report ---`, 14, finalY + 10);

    doc.save(`${title.replace(/ /g, '_')}-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    toast({
      title: "PDF Report Generated",
      description: "Your report has been successfully downloaded.",
    });
    setPdfPending(false);
  };

  async function handleAiAnalysis(values: z.infer<typeof reportSchema>) {
      setAiPending(true);
      setGeneratedAnalysis(null);
      try {
        const transactions = await getTransactionsForDateRange(values.dateRange);
        if (transactions.length === 0) {
            toast({ variant: 'destructive', title: 'No Data Found', description: 'Cannot generate AI analysis without transactions in the selected date range.' });
            setAiPending(false);
            return;
        }

        const contextString = `
            Report Request: ${values.analysisRequest}
            Transactions: ${JSON.stringify(transactions.map(t => ({...t, date: t.date.toDate()})), null, 2)}
        `;

        const result = await generateReport(contextString);
        setGeneratedAnalysis(result.report);
        toast({ title: 'AI Analysis Complete', description: 'Review the generated analysis below.' });

      } catch (error) {
        console.error("Failed to generate AI analysis:", error);
        toast({ variant: 'destructive', title: 'AI Analysis Failed', description: 'An unexpected error occurred.' });
      } finally {
        setAiPending(false);
      }
  }

  async function onSubmit(values: z.infer<typeof reportSchema>) {
    setPdfPending(true);
    try {
      const transactions = await getTransactionsForDateRange(values.dateRange);
      
      if (transactions.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No Data Found',
          description: 'There are no transactions in the selected date range to generate a report.',
        });
        setPdfPending(false);
        return;
      }
      
      await generatePdf({
        title: values.reportTitle,
        dateRange: values.dateRange,
        transactions,
        analysis: generatedAnalysis || undefined,
      });

    } catch (error) {
      console.error("Failed to generate report:", error);
      toast({
        variant: 'destructive',
        title: 'Error Generating Report',
        description: 'An unexpected error occurred. Please try again.',
      });
      setPdfPending(false);
    }
  }


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline">Financial Reports</h1>
      </div>
       <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate Financial Report</CardTitle>
              <CardDescription>
                Select a date range and provide a title for your PDF report. You can also generate an AI-powered analysis to include in the report.
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

              <FormField
                control={form.control}
                name="analysisRequest"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AI Analysis Request</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Provide a summary of income vs expenses and identify top spending categories."
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Describe what you want the AI to analyze in the report.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {generatedAnalysis && (
                  <div className="space-y-2">
                      <Label>Generated Analysis</Label>
                      <Card className="bg-muted/50">
                          <CardContent className="p-4 text-sm">
                              {generatedAnalysis}
                          </CardContent>
                      </Card>
                  </div>
              )}

            </CardContent>
            <CardFooter className="gap-2">
              <Button type="button" variant="outline" onClick={form.handleSubmit(handleAiAnalysis)} disabled={isAiPending}>
                  {isAiPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                  Generate AI Analysis
              </Button>
              <Button type="submit" disabled={isPdfPending}>
                {isPdfPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Generate PDF Report
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </div>
  );
}
