'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getSalesByMonthAction } from '@/app/dashboard/actions';
import { useEffect, useState } from 'react';

type SalesByMonth = {
    month: string;
    sales: number;
    expenses: number;
};

export default function SalesChart() {
  const [salesData, setSalesData] = useState<SalesByMonth[]>([]);
  
  useEffect(() => {
    getSalesByMonthAction().then(setSalesData);
  }, []);

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
