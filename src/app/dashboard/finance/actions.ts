'use server';

import { z } from 'zod';
import { generateReport } from '@/ai/flows/generate-report';
import { format, parseISO, isWithinInterval } from 'date-fns';
import { transactions as allTransactions } from '@/lib/data';

const reportSchema = z.object({
  reportDescription: z.string().min(1, 'Report description is required.'),
  dateRangeFrom: z.string().min(1, 'Start date is required.'),
  dateRangeTo: z.string().min(1, 'End date is required.'),
});

type ReportState = {
  report: string | null;
  error: string | null;
};

export async function handleGenerateFinanceReport(
  prevState: ReportState,
  formData: FormData
): Promise<ReportState> {
  const rawFormData = {
    reportDescription: formData.get('reportDescription'),
    dateRangeFrom: formData.get('dateRangeFrom'),
    dateRangeTo: formData.get('dateRangeTo'),
  };

  const validationResult = reportSchema.safeParse(rawFormData);

  if (!validationResult.success) {
    return {
      report: null,
      error: validationResult.error.errors.map((e) => e.message).join(', '),
    };
  }
  
  const { reportDescription, dateRangeFrom, dateRangeTo } = validationResult.data;

  try {
    const fromDate = parseISO(dateRangeFrom);
    const toDate = parseISO(dateRangeTo);
    
    const transactionsInRange = allTransactions.filter(t => {
        const transactionDate = parseISO(t.date);
        return isWithinInterval(transactionDate, { start: fromDate, end: toDate });
    });

    if (transactionsInRange.length === 0) {
        return {
            report: null,
            error: "No transaction data found for the selected date range. Please select a different range.",
        };
    }

    const input = {
        reportDescription: reportDescription,
        fromDate: format(fromDate, 'yyyy-MM-dd'),
        toDate: format(toDate, 'yyyy-MM-dd'),
        transactions: transactionsInRange.map(t => ({
          id: t.id,
          type: t.type.toLowerCase() as 'income' | 'expense',
          amount: t.amount,
          description: t.clientName,
          date: format(parseISO(t.date), 'yyyy-MM-dd'),
          category: t.product,
        })),
    };
    
    const result = await generateReport(input);

    if (!result.report) {
      return {
        report: null,
        error: 'The AI could not generate a report with the provided data.',
      };
    }

    return { report: result.report, error: null };
  } catch (error) {
    console.error('Error generating report:', error);
    return {
      report: null,
      error: 'An unexpected error occurred while generating the report. Please check the inputs and try again.',
    };
  }
}
