'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { Calendar as CalendarIcon, Loader2, Wand2 } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { generateClientReport } from '@/app/dashboard/reports/actions';
import { transactions as allTransactions } from '@/lib/data'; // We'll use this as our 'live' data source for now

const reportSchema = z.object({
  reportDescription: z.string().min(10, {
    message: 'Description must be at least 10 characters.',
  }),
  dateRange1: z.object({
    from: z.date({ required_error: 'A start date is required.' }),
    to: z.date({ required_error: 'An end date is required.' }),
  }),
});

type ReportState = {
  report: string | null;
  error: string | null;
  pending: boolean;
};

export default function ReportGenerator() {
  const [state, setState] = useState<ReportState>({
    report: null,
    error: null,
    pending: false,
  });

  const form = useForm<z.infer<typeof reportSchema>>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      reportDescription: 'Provide a summary of sales and profits, highlighting the best performing product.',
    },
  });

  async function onSubmit(values: z.infer<typeof reportSchema>) {
    setState({ report: null, error: null, pending: true });

    const fromDate = values.dateRange1.from;
    const toDate = values.dateRange1.to;
    toDate.setHours(23, 59, 59, 999);

    const filteredTransactions = allTransactions.filter(t => {
      const transactionDate = new Date(t.date);
      return isWithinInterval(transactionDate, { start: fromDate, end: toDate });
    });

    if (filteredTransactions.length === 0) {
      setState({
        report: null,
        pending: false,
        error: "No transaction data found for the selected date range. Please select a different period or add some transactions.",
      });
      return;
    }

    const totalIncome = filteredTransactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpenses = Math.abs(filteredTransactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0));

    const contextString = `
      Report Request: ${values.reportDescription}
      Date Range: ${format(fromDate, 'PPP')} to ${format(toDate, 'PPP')}
      Total Income: $${totalIncome.toLocaleString()}
      Total Expenses: $${totalExpenses.toLocaleString()}
      Net Profit: $${(totalIncome - totalExpenses).toLocaleString()}
      
      Transactions:
      ${filteredTransactions.map(t =>
        `- ${format(new Date(t.date), 'yyyy-MM-dd')}: ${t.type} of $${Math.abs(t.amount)} for '${t.product}' related to '${t.clientName}'`
      ).join('\n')}
    `;

    try {
      const report = await generateClientReport(contextString);
      setState({ report, error: null, pending: false });
    } catch (error: any) {
      setState({ report: null, error: error.message, pending: false });
    }
  }

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Generate AI-Powered Analysis</CardTitle>
              <CardDescription>
                Describe the analysis you want to generate and select a date range.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="dateRange1"
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
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="reportDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>What do you want to analyze?</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="e.g., Compare sales, expenses, and profits..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      This will be sent to an AI to generate the report. Be as specific as you like.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={state.pending}>
                {state.pending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Generate Report
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
      
      {state.pending && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Generating Report...</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p>The AI is analyzing the data. This might take a moment.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {state.error && (
        <Card className="mt-6 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{state.error}</p>
          </CardContent>
        </Card>
      )}

      {state.report && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Generated Report</CardTitle>
            <CardDescription>
              The following report was generated by AI based on your query.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap font-body text-sm bg-muted p-4 rounded-lg">
              {state.report}
            </pre>
          </CardContent>
        </Card>
      )}
    </>
  );
}
