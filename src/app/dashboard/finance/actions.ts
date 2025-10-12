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

    // New simplified method: create a context string for the AI
    let reportContext = `Date Range: From ${format(fromDate, 'yyyy-MM-dd')} to ${format(toDate, 'yyyy-MM-dd')}\n\n`;
    reportContext += "Transactions:\n";

    let totalIncome = 0;
    let totalExpenses = 0;

    transactionsInRange.forEach(t => {
        const transactionDate = format(parseISO(t.date), 'yyyy-MM-dd');
        const type = t.type.toLowerCase();
        reportContext += `- ${transactionDate}: ${t.clientName} (${t.product}) - Amount: ${t.amount} (${type})\n`;
        if (type === 'income') {
            totalIncome += t.amount;
        } else {
            totalExpenses += t.amount;
        }
    });

    reportContext += `\nSummary:\n`;
    reportContext += `Total Income: ${totalIncome.toLocaleString()}\n`;
    reportContext += `Total Expenses: ${totalExpenses.toLocaleString()}\n`;
    reportContext += `Net Profit: ${(totalIncome + totalExpenses).toLocaleString()}\n`;


    const input = {
        reportDescription: reportDescription,
        reportContext: reportContext,
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
