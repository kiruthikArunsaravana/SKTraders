'use server';

import mysql from 'mysql2/promise';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sktraders',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

type KpiData = {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  revenueChange: number; // Percentage change from last month
  expensesChange: number; // Percentage change from last month
  topProduct: { name: string | null; unitsSold: number | null; };
  totalExportValue: number;
};

type RecentTransaction = {
    id: string;
    clientName: string;
    product: string;
    amount: number;
    type: 'Income' | 'Expense';
    clientAvatarUrl: string; // Placeholder for now
};

type SalesByMonth = {
    month: string;
    sales: number;
    expenses: number;
};


export async function getDashboardKpiData(): Promise<KpiData> {
    const connection = await pool.getConnection();
    try {
        const now = new Date();
        const thisMonthStart = format(startOfMonth(now), 'yyyy-MM-dd HH:mm:ss');
        const thisMonthEnd = format(endOfMonth(now), 'yyyy-MM-dd HH:mm:ss');
        const lastMonth = subMonths(now, 1);
        const lastMonthStart = format(startOfMonth(lastMonth), 'yyyy-MM-dd HH:mm:ss');
        const lastMonthEnd = format(endOfMonth(lastMonth), 'yyyy-MM-dd HH:mm:ss');

        // This month's financials
        const [thisMonthFinancials] = await connection.query(`
            SELECT
                COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as totalRevenue,
                COALESCE(ABS(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)), 0) as totalExpenses
            FROM financial_transactions
            WHERE date BETWEEN ? AND ?
        `, [thisMonthStart, thisMonthEnd]);

        // Last month's financials for comparison
        const [lastMonthFinancials] = await connection.query(`
            SELECT
                COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as lastMonthRevenue,
                COALESCE(ABS(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)), 0) as lastMonthExpenses
            FROM financial_transactions
            WHERE date BETWEEN ? AND ?
        `, [lastMonthStart, lastMonthEnd]);
        
        // Top product this month
        const [topProductRows]: [any[], any] = await connection.query(`
            SELECT category as name, COUNT(*) as unitsSold
            FROM financial_transactions
            WHERE type = 'income' AND date BETWEEN ? AND ?
            GROUP BY category
            ORDER BY unitsSold DESC
            LIMIT 1;
        `, [thisMonthStart, thisMonthEnd]);

        // Total export value this month
        const [exportRows]: [any[], any] = await connection.query(`
            SELECT COALESCE(SUM(value), 0) as totalExportValue
            FROM exports
            WHERE date BETWEEN ? AND ?
        `, [thisMonthStart, thisMonthEnd]);

        const thisMonth = thisMonthFinancials as any;
        const lastMonthData = lastMonthFinancials as any;
        
        const totalRevenue = parseFloat(thisMonth[0].totalRevenue);
        const totalExpenses = parseFloat(thisMonth[0].totalExpenses);
        const lastMonthRevenue = parseFloat(lastMonthData[0].lastMonthRevenue);
        const lastMonthExpenses = parseFloat(lastMonthData[0].lastMonthExpenses);

        const revenueChange = lastMonthRevenue > 0 ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : (totalRevenue > 0 ? 100 : 0);
        const expensesChange = lastMonthExpenses > 0 ? ((totalExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 : (totalExpenses > 0 ? 100 : 0);

        return {
            totalRevenue,
            totalExpenses,
            netProfit: totalRevenue - totalExpenses,
            revenueChange,
            expensesChange,
            topProduct: {
                name: topProductRows[0]?.name || 'N/A',
                unitsSold: topProductRows[0]?.unitsSold || 0,
            },
            totalExportValue: parseFloat(exportRows[0].totalExportValue),
        };

    } catch (error) {
        console.error("Database Error (getDashboardKpiData):", error);
        return { totalRevenue: 0, totalExpenses: 0, netProfit: 0, revenueChange: 0, expensesChange: 0, topProduct: { name: 'N/A', unitsSold: 0 }, totalExportValue: 0 };
    } finally {
        connection.release();
    }
}

export async function getRecentTransactionsAction(): Promise<RecentTransaction[]> {
    try {
        const [rows] = await pool.query(`
            SELECT id, description as clientName, category as product, amount, type
            FROM financial_transactions
            ORDER BY date DESC
            LIMIT 5;
        `);
        return (rows as any[]).map(row => ({
            ...row,
            type: row.type.charAt(0).toUpperCase() + row.type.slice(1),
            amount: parseFloat(row.amount),
            clientAvatarUrl: `https://picsum.photos/seed/${row.id}/40/40`, // Placeholder avatar
        }));
    } catch (error) {
        console.error("Database Error (getRecentTransactionsAction):", error);
        return [];
    }
}

export async function getSalesByMonthAction(): Promise<SalesByMonth[]> {
    try {
        const [rows]: [any[], any] = await pool.query(`
            SELECT
                DATE_FORMAT(date, '%Y-%m') as month,
                SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as sales,
                ABS(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)) as expenses
            FROM financial_transactions
            WHERE date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
            GROUP BY DATE_FORMAT(date, '%Y-%m')
            ORDER BY month ASC;
        `);
        
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const result: SalesByMonth[] = monthNames.map(m => ({ month: m, sales: 0, expenses: 0 }));

        rows.forEach(row => {
            const monthIndex = parseInt(row.month.split('-')[1], 10) - 1;
            const monthName = monthNames[monthIndex];
            if(monthName) {
                const existing = result.find(r => r.month === monthName);
                if (existing) {
                    existing.sales = parseFloat(row.sales);
                    existing.expenses = parseFloat(row.expenses);
                }
            }
        });

        return result;

    } catch (error) {
        console.error("Database Error (getSalesByMonthAction):", error);
        return monthNames.map(m => ({ month: m, sales: 0, expenses: 0 }));
    }
}
