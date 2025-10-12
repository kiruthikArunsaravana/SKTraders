'use server';

import type { Export } from '@/lib/types';
import { z } from 'zod';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'sktraders',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const exportSchema = z.object({
    buyerName: z.string().min(1, "Buyer name is required"),
    country: z.string().min(1, "Country is required"),
    port: z.string().min(1, "Port is required"),
    value: z.coerce.number().positive("Value must be a positive number"),
});

export async function getExportsAction(): Promise<Export[]> {
  try {
    const [rows] = await pool.query('SELECT *, DATE_FORMAT(date, "%Y-%m-%dT%H:%i:%s.000Z") as date FROM exports ORDER BY date DESC');
    return rows as Export[];
  } catch (error) {
    console.error("Database Error (getExportsAction):", error);
    return [];
  }
}

export async function addExportAction(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries());
    
    const validation = exportSchema.safeParse(rawData);
    if (!validation.success) {
        return { success: false, error: validation.error.flatten().fieldErrors };
    }

    const { buyerName, country, port, value } = validation.data;
    const newExportData = {
      buyerName,
      country,
      port,
      value,
      date: new Date().toISOString().split('T')[0],
    };

    try {
        const [result] = await pool.execute(
            'INSERT INTO exports (buyerName, country, port, value, date) VALUES (?, ?, ?, ?, ?)',
            [newExportData.buyerName, newExportData.country, newExportData.port, newExportData.value, newExportData.date]
        );
        
        const insertedId = (result as any).insertId;
        const newExport: Export = { id: insertedId.toString(), ...newExportData, date: new Date(newExportData.date).toISOString() };

        console.log(`Export added with ID: ${insertedId}`);
        return { success: true, newExport };

    } catch (error) {
        console.error("Database Error (addExportAction):", error);
        return { success: false, error: "Failed to save export order to the database." };
    }
}
