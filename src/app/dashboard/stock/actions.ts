'use server';

import type { Product } from '@/lib/types';
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

// Schema for validating stock updates
const stockSchema = z.object({
    product: z.enum(['coco-pith', 'coir-fiber', 'husk-chips']),
    quantity: z.coerce.number().int("Quantity must be a whole number"),
});


export async function getProductsAction(): Promise<Omit<Product, 'icon'>[]> {
  try {
    const [rows] = await pool.query('SELECT id, name, quantity, costPrice, sellingPrice FROM products');
    const products = (rows as any[]).map(row => ({
        ...row,
        quantity: parseInt(row.quantity, 10),
        costPrice: parseFloat(row.costPrice),
        sellingPrice: parseFloat(row.sellingPrice)
    }));
    return products as Omit<Product, 'icon'>[];
  } catch (error) {
    console.error("Database Error (getProductsAction):", error);
    // If the table doesn't exist or is empty, we should initialize it.
    console.log("Attempting to initialize products table...");
    await initializeProducts();
    const [rows] = await pool.query('SELECT id, name, quantity, costPrice, sellingPrice FROM products');
    return rows as Omit<Product, 'icon'>[];
  }
}

export async function updateStockAction(formData: FormData) {
    const rawData = Object.fromEntries(formData.entries());
    
    const validation = stockSchema.safeParse(rawData);
    if (!validation.success) {
        return { success: false, error: validation.error.flatten().fieldErrors };
    }

    const { product: productId, quantity } = validation.data;

    try {
        await pool.execute(
            'UPDATE products SET quantity = quantity + ? WHERE id = ?',
            [quantity, productId]
        );
        
        const [updatedRows] = await pool.query('SELECT id, name, quantity FROM products WHERE id = ?', [productId]);
        const updatedProduct = (updatedRows as any)[0];
        
        return { success: true, updatedProduct };

    } catch (error) {
        console.error("Database Error (updateStockAction):", error);
        return { success: false, error: "Failed to update stock in the database." };
    }
}

async function initializeProducts() {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        // Use INSERT IGNORE to avoid errors if products already exist.
        await connection.execute(`
            INSERT IGNORE INTO products (id, name, quantity, costPrice, sellingPrice) VALUES 
            ('coco-pith', 'Coco Pith', 0, 120, 180),
            ('coir-fiber', 'Coir Fiber', 0, 250, 350),
            ('husk-chips', 'Husk Chips', 0, 180, 250)
        `);
        await connection.commit();
        console.log("Products table initialized successfully.");
    } catch (error) {
        await connection.rollback();
        console.error("Error initializing products table:", error);
    } finally {
        connection.release();
    }
}
