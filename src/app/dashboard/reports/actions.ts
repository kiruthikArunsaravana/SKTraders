'use server';

import { transactions } from '@/lib/data';
import type { FinancialTransaction, Transaction } from '@/lib/types';
import { isWithinInterval, parseISO } from 'date-fns';

export async function getTransactionsForDateRange(dateRange: {
  from: Date;
  to: Date;
}): Promise<FinancialTransaction[]> {
  const { from, to } = dateRange;
  to.setHours(23, 59, 59, 999); 

  const allTransactions: FinancialTransaction[] = transactions.map(t => ({
      id: t.id,
      type: t.type.toLowerCase() as 'income' | 'expense',
      amount: t.amount,
      description: t.clientName,
      date: t.date,
      category: t.product,
  }));

  const filtered = allTransactions.filter(t => {
    const transactionDate = parseISO(t.date);
    return isWithinInterval(transactionDate, { start: from, end: to });
  });

  return filtered;
}
