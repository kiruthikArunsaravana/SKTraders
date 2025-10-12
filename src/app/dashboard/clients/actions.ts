'use server';

import type { Client } from '@/lib/types';
import { z } from 'zod';

// This is where you would import your database connection library
// For example: import { pool } from '@/lib/mysql';

// Mock database - replace this with your actual database logic
const clients: Client[] = [];
let lastId = 0;

// Schema for validating form data
const clientSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    company: z.string().min(1, "Company is required"),
    country: z.string().min(1, "Country is required"),
});

export async function getClientsAction(): Promise<Client[]> {
  // In a real app, you would fetch clients from your database here.
  // Example:
  // const [rows] = await pool.query('SELECT * FROM clients');
  // return rows as Client[];
  
  return Promise.resolve(clients);
}

export async function addClientAction(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries());
    
    // 1. VALIDATE DATA ON THE SERVER
    const validation = clientSchema.safeParse(rawData);
    if (!validation.success) {
        return { success: false, error: validation.error.flatten().fieldErrors };
    }

    const { name, email, company, country } = validation.data;
    
    // This is a temporary new client object. 
    // In a real scenario, the database would generate the ID.
    const newClient: Client = {
      id: (++lastId).toString(),
      name,
      email,
      company,
      country,
      totalSales: 0,
      lastPurchaseDate: new Date().toISOString().split('T')[0],
    };

    try {
        // 2. INSERT DATA INTO YOUR MYSQL DATABASE
        // This is where you would write your Node.js code to insert into MySQL.
        // For example, using a library like 'mysql2/promise':
        
        /*
        const connection = await getDbConnection(); // Your function to get a DB connection
        const [result] = await connection.execute(
            'INSERT INTO clients (name, email, company, country, totalSales, lastPurchaseDate) VALUES (?, ?, ?, ?, ?, ?)',
            [newClient.name, newClient.email, newClient.company, newClient.country, newClient.totalSales, newClient.lastPurchaseDate]
        );
        
        // You might want to get the inserted ID and return the full client object
        const insertedId = (result as any).insertId;
        newClient.id = insertedId.toString();
        
        console.log(`Client added with ID: ${insertedId}`);
        */
        
        // For this demonstration, we'll just add to our in-memory array.
        clients.push(newClient);
        console.log('Successfully added client to mock database:', newClient);


        // 3. RETURN A SUCCESS RESPONSE
        // It's good practice to return the created object to the client
        // so the UI can be updated without needing another fetch.
        return { success: true, newClient };

    } catch (error) {
        console.error("Database Error:", error);
        return { success: false, error: "Failed to save client to the database." };
    }
}
