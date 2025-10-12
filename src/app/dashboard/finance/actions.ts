'use server';

import type { FinancialTransaction } from '@/lib/types';
import { z } from 'zod';
import mysql from 'mysql2/promise';
import { format } from 'date-fns';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'sktraders',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const transactionSchema = z.object({
    type: z.enum(['income', 'expense']),
    amount: z.coerce.number().positive("Amount must be a positive number"),
    description: z.string().min(1, "Description is required"),
    category: z.string().min(1, "Category/Product is required"),
    date: z.string().min(1, "Date is required"),
});

export async function getTransactionsAction(): Promise<FinancialTransaction[]> {
  try {
    const [rows] = await pool.query('SELECT *, DATE_FORMAT(date, "%Y-%m-%dT%H:%i:%s.000Z") as date FROM financial_transactions ORDER BY date DESC');
    return (rows as any[]).map(row => ({...row, amount: parseFloat(row.amount)}));
  } catch (error) {
    console.error("Database Error (getTransactionsAction):", error);
    return [];
  }
}

export async function addTransactionAction(formData: FormData) {
    const rawData = {
        type: formData.get('type'),
        amount: formData.get('amount'),
        description: formData.get('description'),
        category: formData.get('category') || formData.get('product'),
        date: formData.get('date'),
    };
    
    const validation = transactionSchema.safeParse(rawData);
    if (!validation.success) {
        console.error("Validation failed", validation.error.flatten().fieldErrors);
        return { success: false, error: validation.error.flatten().fieldErrors };
    }

    const { type, amount, description, category, date } = validation.data;
    
    const finalAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
    const formattedDate = format(new Date(date), 'yyyy-MM-dd HH:mm:ss');

    try {
        const [result] = await pool.execute(
            'INSERT INTO financial_transactions (type, amount, description, category, date) VALUES (?, ?, ?, ?, ?)',
            [type, finalAmount, description, category, formattedDate]
        );
        
        const insertedId = (result as any).insertId;
        const newTransaction: FinancialTransaction = { 
            id: insertedId.toString(), 
            type,
            amount: finalAmount,
            description,
            category,
            date: new Date(date).toISOString(),
        };

        return { success: true, newTransaction };

    } catch (error) {
        console.error("Database Error (addTransactionAction):", error);
        return { success: false, error: "Failed to save transaction to the database." };
    }
}
