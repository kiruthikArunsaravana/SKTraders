'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
import { subMonths } from 'date-fns';
import { useMemo } from 'react';
import type { FinancialTransaction } from '@/lib/types';


type SalesByMonth = {
    month: string;
    sales: number;
    expenses: number;
};

export default function SalesChart() {
  const firestore = useFirestore();

  // const transactionsQuery = useMemoFirebase(() => {
  //   if (!firestore) return null;
  //   const oneYearAgo = subMonths(new Date(), 12);
  //   return query(collection(firestore, 'financial_transactions'), where('date', '>=', Timestamp.fromDate(oneYearAgo)));
  // }, [firestore]);

  // const { data: transactions } = useCollection<FinancialTransaction>(transactionsQuery);
  const transactions: FinancialTransaction[] | null = [];


  const salesData = useMemo(() => {
    const monthNames = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ];
    const result: SalesByMonth[] = monthNames.map((m) => ({ month: m, sales: 0, expenses: 0 }));

    if (!transactions) return result;

    transactions.forEach((doc) => {
      const data = doc;
      const monthIndex = data.date.toDate().getMonth();
      const monthName = monthNames[monthIndex];
      if (monthName) {
        const existing = result.find((r) => r.month === monthName);
        if (existing) {
          if (data.type === 'income') {
            existing.sales += data.amount;
          } else {
            existing.expenses += Math.abs(data.amount);
          }
        }
      }
    });
    return result;
  }, [transactions]);


  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle>Sales Performance</CardTitle>
        <CardDescription>A comparison of your sales and expenses over the last year.</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                    dataKey="month" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${value / 1000}K`}
                />
                <Tooltip 
                    cursor={{fill: 'hsl(var(--muted))'}}
                    contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: 'var(--radius)'
                    }}
                />
                <Legend iconSize={10} />
                <Bar dataKey="sales" fill="hsl(var(--chart-1))" name="Sales" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="hsl(var(--chart-2))" name="Expenses" radius={[4, 4, 0, 0]} />
            </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
