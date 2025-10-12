'use server';

import { generateReport } from '@/ai/flows/generate-report';
import { transactions as allTransactions } from '@/lib/data';
import { isWithinInterval } from 'date-fns';

export async function generateClientReport(
  reportDescription: string,
  dateRange: { from: Date; to: Date }
): Promise<string> {
  const fromDate = new Date(dateRange.from);
  const toDate = new Date(dateRange.to);
  toDate.setHours(23, 59, 59, 999);

  const filteredTransactions = allTransactions.filter(t => {
    const transactionDate = new Date(t.date);
    return isWithinInterval(transactionDate, { start: fromDate, end: toDate });
  });

  if (filteredTransactions.length === 0) {
    throw new Error(
      'No transaction data found for the selected date range. Please select a different period.'
    );
  }

  const contextString = `
      Report Request: ${reportDescription}
      Date Range: ${fromDate.toDateString()} to ${toDate.toDateString()}
      
      Transactions:
      ${filteredTransactions
        .map(
          t =>
            `- ${new Date(t.date).toLocaleDateString()}: ${t.type} of $${Math.abs(
              t.amount
            )} for '${t.product}' related to '${t.clientName}'`
        )
        .join('\n')}
    `;

  try {
    const result = await generateReport(contextString);
    if (!result.report) {
      throw new Error(
        'The AI could not generate a report with the provided data.'
      );
    }
    return result.report;
  } catch (error) {
    console.error('Error generating report:', error);
    throw new Error(
      'An unexpected error occurred while generating the report. Please check the inputs and try again.'
    );
  }
}
