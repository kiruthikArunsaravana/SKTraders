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

async function initializeClientsTable() {
    const connection = await pool.getConnection();
    try {
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS clients (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                email VARCHAR(255) NOT NULL,
                company VARCHAR(255) NOT NULL,
                country VARCHAR(255) NOT NULL,
                totalSales DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
                lastPurchaseDate DATE NOT NULL
            );
        `);
        console.log("'clients' table is ready.");
    } catch (error) {
        console.error("Error initializing clients table:", error);
    } finally {
        connection.release();
    }
}


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

  } catch (error: any) {
    if (error.code === 'ER_NO_SUCH_TABLE') {
        console.log("Clients table not found, initializing it...");
        await initializeClientsTable();
        // Return empty array for the first load
        return [];
    }
    console.error("Database Error (getClientsAction):", error);
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

    } catch (error: any) {
         if (error.code === 'ER_NO_SUCH_TABLE') {
            console.log("Clients table not found on add, initializing it...");
            await initializeClientsTable();
            // Retry the insertion
             const [result] = await pool.execute(
                'INSERT INTO clients (name, email, company, country, totalSales, lastPurchaseDate) VALUES (?, ?, ?, ?, ?, ?)',
                [newClientData.name, newClientData.email, newClientData.company, newClientData.country, newClientData.totalSales, newClientData.lastPurchaseDate]
            );
            const insertedId = (result as any).insertId;
            const newClient: Client = { id: insertedId.toString(), ...newClientData };
            return { success: true, newClient };
        }
        console.error("Database Error (addClientAction):", error);
        return { success: false, error: "Failed to save client to the database." };
    }
}
