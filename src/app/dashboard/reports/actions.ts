'use server';

import type { FinancialTransaction } from '@/lib/types';
import { format } from 'date-fns';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sktraders',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});


export async function getTransactionsForDateRange(dateRange: {
  from: Date;
  to: Date;
}): Promise<FinancialTransaction[]> {
  const { from, to } = dateRange;
  to.setHours(23, 59, 59, 999);
  const fromFormatted = format(from, 'yyyy-MM-dd HH:mm:ss');
  const toFormatted = format(to, 'yyyy-MM-dd HH:mm:ss');


  try {
    const [rows] = await pool.query(
        'SELECT *, DATE_FORMAT(date, "%Y-%m-%dT%H:%i:%s.000Z") as date FROM financial_transactions WHERE date BETWEEN ? AND ? ORDER BY date DESC',
        [fromFormatted, toFormatted]
    );
    return (rows as any[]).map(row => ({...row, amount: parseFloat(row.amount)}));
  } catch (error) {
    console.error("Database Error (getTransactionsForDateRange):", error);
    return [];
  }
}
