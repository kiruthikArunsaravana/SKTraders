'use server';

import type { Client } from '@/lib/types';
import { z } from 'zod';

// STEP 1: Install a MySQL library for Node.js
// In your terminal, run: npm install mysql2
//
// STEP 2: Import the library and create a database connection
// You would typically do this in a separate file (e.g., src/lib/db.ts)
/*
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: 'localhost', // Your MySQL host
  user: 'your_user', // Your MySQL username
  password: 'your_password', // Your MySQL password
  database: 'your_database_name',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});
*/

// For demonstration, we'll continue using an in-memory array.
// When you connect to your database, you can remove this mock data.
const clients: Client[] = [];
let lastId = 0;


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
  // STEP 3: Replace mock data with a database query
  try {
    // Example of how you would fetch data from your MySQL database:
    /*
    const [rows] = await pool.query('SELECT * FROM clients ORDER BY name ASC');
    return rows as Client[];
    */
    
    // Returning mock data for now.
    return Promise.resolve(clients);

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
        // STEP 4: Replace mock logic with a database INSERT query
        // This is where you write your Node.js code to insert into MySQL.
        /*
        const [result] = await pool.execute(
            'INSERT INTO clients (name, email, company, country, totalSales, lastPurchaseDate) VALUES (?, ?, ?, ?, ?, ?)',
            [newClientData.name, newClientData.email, newClientData.company, newClientData.country, newClientData.totalSales, newClientData.lastPurchaseDate]
        );
        
        const insertedId = (result as any).insertId;
        const newClient: Client = { id: insertedId.toString(), ...newClientData };

        console.log(`Client added with ID: ${insertedId}`);
        return { success: true, newClient };
        */
        
        // For this demonstration, we'll just add to our in-memory array.
        // You can remove this block when you implement the database logic.
        const newClient: Client = { id: (++lastId).toString(), ...newClientData };
        clients.push(newClient);
        console.log('Successfully added client to mock database:', newClient);
        return { success: true, newClient };


    } catch (error) {
        console.error("Database Error (addClientAction):", error);
        return { success: false, error: "Failed to save client to the database." };
    }
}
