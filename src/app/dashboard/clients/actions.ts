'use server';

import type { Client } from '@/lib/types';
import { z } from 'zod';
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sktraders',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});


// Schema for validating form data remains the same
const clientSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    company: z.string().min(1, "Company is required"),
    country: z.string().min(1, "Country is required"),
});

/**
 * This function runs on the server and fetches clients from the database.
 */
export async function getClientsAction(): Promise<Client[]> {
  try {
    const [rows] = await pool.query('SELECT * FROM clients ORDER BY name ASC');
    return rows as Client[];

  } catch (error) {
    console.error("Database Error (getClientsAction):", error);
    // In a real app, you'd want more robust error handling
    return [];
  }
}

/**
 * This function runs on the server and saves a new client to the database.
 */
export async function addClientAction(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries());
    
    // 1. Validate data on the server
    const validation = clientSchema.safeParse(rawData);
    if (!validation.success) {
        return { success: false, error: validation.error.flatten().fieldErrors };
    }

    const { name, email, company, country } = validation.data;
    
    // In a real scenario, the database would generate the ID.
    const newClientData = {
      name,
      email,
      company,
      country,
      totalSales: 0,
      lastPurchaseDate: new Date().toISOString().split('T')[0],
    };

    try {
        const [result] = await pool.execute(
            'INSERT INTO clients (name, email, company, country, totalSales, lastPurchaseDate) VALUES (?, ?, ?, ?, ?, ?)',
            [newClientData.name, newClientData.email, newClientData.company, newClientData.country, newClientData.totalSales, newClientData.lastPurchaseDate]
        );
        
        const insertedId = (result as any).insertId;
        const newClient: Client = { id: insertedId.toString(), ...newClientData };

        console.log(`Client added with ID: ${insertedId}`);
        return { success: true, newClient };

    } catch (error) {
        console.error("Database Error (addClientAction):", error);
        return { success: false, error: "Failed to save client to the database." };
    }
}
