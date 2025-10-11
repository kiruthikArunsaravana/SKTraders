
'use server';

import { z } from 'zod';
import { generateReport } from '@/ai/flows/generate-report';
import { format } from 'date-fns';
import { transactions } from '@/lib/data';

const reportSchema = z.object({
  reportDescription: z.string().min(1),
  dateRangeFrom: z.string().min(1),
  dateRangeTo: z.string().min(1),
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
    dateRangeFrom: formData.get('dateRange.from'),
    dateRangeTo: formData.get('dateRange.to'),
  };

  try {
    const validatedFields = reportSchema.parse(rawFormData);
    
    const fromDate = new Date(validatedFields.dateRangeFrom);
    const toDate = new Date(validatedFields.dateRangeTo);
    
    const transactionsInRange = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= fromDate && transactionDate <= toDate;
    });

    if (transactionsInRange.length === 0) {
        return {
            report: null,
            error: "No transaction data found for the selected date range. Please select a different range.",
        };
    }

    const input = {
        reportDescription: validatedFields.reportDescription,
        fromDate: format(fromDate, 'yyyy-MM-dd'),
        toDate: format(toDate, 'yyyy-MM-dd'),
        transactions: transactionsInRange.map(t => ({
          id: t.id,
          type: t.type.toLowerCase() as 'income' | 'expense',
          amount: t.amount,
          description: t.clientName,
          date: t.date,
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
    if (error instanceof z.ZodError) {
        return { report: null, error: "Validation failed: " + error.errors.map(e => e.message).join(', ') };
    }
    return {
      report: null,
      error: 'An unexpected error occurred while generating the report. Please check the inputs and try again.',
    };
  }
}
