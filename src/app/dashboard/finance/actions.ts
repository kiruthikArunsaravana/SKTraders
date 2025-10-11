
'use server';

import { z } from 'zod';
import { generateReport } from '@/ai/flows/generate-report';
import { format } from 'date-fns';
import { transactions } from '@/lib/data';

const reportSchema = z.object({
  reportDescription: z.string().min(1),
  dateRange1From: z.string().min(1),
  dateRange1To: z.string().min(1),
  dateRange2From: z.string().optional(),
  dateRange2To: z.string().optional(),
}).refine(data => {
    if (data.dateRange2From || data.dateRange2To) {
        return !!data.dateRange2From && !!data.dateRange2To;
    }
    return true;
}, {
    message: "Both 'from' and 'to' dates are required for the second date range if one is provided.",
    path: ["dateRange2"],
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
    dateRange1From: formData.get('dateRange1.from'),
    dateRange1To: formData.get('dateRange1.to'),
    dateRange2From: formData.get('dateRange2.from') || undefined,
    dateRange2To: formData.get('dateRange2.to') || undefined,
  };

  try {
    const validatedFields = reportSchema.parse(rawFormData);
    
    const fromDate1 = new Date(validatedFields.dateRange1From);
    const toDate1 = new Date(validatedFields.dateRange1To);
    
    const transactionsInRange1 = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= fromDate1 && transactionDate <= toDate1;
    });

    let transactionsInRange2: any[] = [];
    if (validatedFields.dateRange2From && validatedFields.dateRange2To) {
        const fromDate2 = new Date(validatedFields.dateRange2From);
        const toDate2 = new Date(validatedFields.dateRange2To);
        transactionsInRange2 = transactions.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate >= fromDate2 && transactionDate <= toDate2;
        });
    }

    if (transactionsInRange1.length === 0 && transactionsInRange2.length === 0) {
        return {
            report: null,
            error: "No transaction data found for the selected date range(s). Please select a different range.",
        };
    }

    const input = {
        reportDescription: validatedFields.reportDescription,
        fromDate1: format(fromDate1, 'yyyy-MM-dd'),
        toDate1: format(toDate1, 'yyyy-MM-dd'),
        transactions1: transactionsInRange1.map(t => ({
          id: t.id,
          type: t.type.toLowerCase() as 'income' | 'expense',
          amount: t.amount,
          description: t.clientName,
          date: t.date,
          category: t.product,
        })),
        fromDate2: validatedFields.dateRange2From && validatedFields.dateRange2To ? format(new Date(validatedFields.dateRange2From), 'yyyy-MM-dd') : 'N/A',
        toDate2: validatedFields.dateRange2From && validatedFields.dateRange2To ? format(new Date(validatedFields.dateRange2To), 'yyyy-MM-dd') : 'N/A',
        transactions2: transactionsInRange2.map(t => ({
          id: t.id,
          type: t.type.toLowerCase() as 'income' | 'expense',
          amount: t.amount,
          description: t.clientName,
          date: t.date,
          category: t.product,
        }))
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
