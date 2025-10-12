'use server';

import { z } from 'zod';
import { generateReport } from '@/ai/flows/generate-report';
import { format, parseISO } from 'date-fns';
import { transactions as allTransactions } from '@/lib/data';

const reportSchema = z.object({
  reportDescription: z.string().min(1),
  dateRange1From: z.string().min(1, 'Date range is required'),
  dateRange1To: z.string().min(1, 'Date range is required'),
});

type ReportState = {
  report: string | null;
  error: string | null;
};

export async function handleGenerateReport(
  prevState: ReportState,
  formData: FormData
): Promise<ReportState> {
  
  const rawFormData = {
    reportDescription: formData.get('reportDescription'),
    dateRange1From: formData.get('dateRange1.from'),
    dateRange1To: formData.get('dateRange1.to'),
  };

  try {
    const validatedFields = reportSchema.safeParse(rawFormData);
    if (!validatedFields.success) {
      return { report: null, error: "Validation failed: " + validatedFields.error.errors.map(e => e.message).join(', ') };
    }
    
    const { reportDescription, dateRange1From, dateRange1To } = validatedFields.data;

    const fromDate = parseISO(dateRange1From);
    const toDate = parseISO(dateRange1To);
    toDate.setHours(23, 59, 59, 999);

    const filteredTransactions = allTransactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= fromDate && transactionDate <= toDate;
    });

    if (filteredTransactions.length === 0) {
      return {
        report: null,
        error: "No transaction data found for the selected date range. Please select a different period.",
      };
    }

    const totalIncome = filteredTransactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);
    const totalExpenses = Math.abs(filteredTransactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0));

    const contextString = `
      Report Request: ${reportDescription}
      Date Range: ${format(fromDate, 'PPP')} to ${format(toDate, 'PPP')}
      Total Income: $${totalIncome.toLocaleString()}
      Total Expenses: $${totalExpenses.toLocaleString()}
      Net Profit: $${(totalIncome - totalExpenses).toLocaleString()}
      
      Transactions:
      ${filteredTransactions.map(t => 
        `- ${t.date}: ${t.type} of $${Math.abs(t.amount)} for '${t.product}' related to '${t.clientName}'`
      ).join('\n')}
    `;
    
    const result = await generateReport(contextString);

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
