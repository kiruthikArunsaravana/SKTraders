'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { FinancialTransaction } from '@/lib/types';
import { collection, query, orderBy, Timestamp, where } from 'firebase/firestore';
import { useMemo } from 'react';
import { format, startOfYear, endOfYear } from 'date-fns';
import { Skeleton } from '../ui/skeleton';

export default function SalesPerformance() {
  const firestore = useFirestore();

  const thisYearRange = useMemo(() => {
    const now = new Date();
    return {
      start: startOfYear(now),
      end: endOfYear(now),
    };
  }, []);

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'financial_transactions'),
      where('date', '>=', Timestamp.fromDate(thisYearRange.start)),
      where('date', '<=', Timestamp.fromDate(thisYearRange.end)),
      orderBy('date', 'asc')
    );
  }, [firestore, thisYearRange]);

  const { data: transactions, isLoading } = useCollection<FinancialTransaction>(transactionsQuery);

  const chartData = useMemo(() => {
    const monthlyData: { [key: string]: { sales: number; expenses: number } } = {};
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    monthNames.forEach(name => {
        monthlyData[name] = { sales: 0, expenses: 0 };
    });

    if (transactions) {
      transactions.forEach(t => {
        const month = format(t.date.toDate(), 'MMM');
        if (monthlyData[month]) {
          if (t.type === 'income') {
            monthlyData[month].sales += t.amount;
          } else {
            monthlyData[month].expenses += Math.abs(t.amount);
          }
        }
      });
    }

    return Object.keys(monthlyData).map(month => ({
      name: month,
      Sales: monthlyData[month].sales,
      Expenses: monthlyData[month].expenses,
    }));
  }, [transactions]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sales Performance</CardTitle>
        <CardDescription>A comparison of your sales and expenses over the last year.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-[350px] w-full" /> :
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="name"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${Number(value) / 1000}k`}
            />
            <Tooltip
                cursor={{fill: 'hsl(var(--muted))'}}
                contentStyle={{backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))'}}
            />
            <Legend iconType="square" />
            <Bar dataKey="Sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Expenses" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        }
      </CardContent>
    </Card>
  );
}
