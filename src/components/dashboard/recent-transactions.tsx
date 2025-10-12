'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { getRecentTransactionsAction } from '@/app/dashboard/actions';
import { useEffect, useState } from 'react';

type RecentTransaction = {
    id: string;
    clientName: string;
    product: string;
    amount: number;
    type: 'Income' | 'Expense';
    clientAvatarUrl: string;
};

export default function RecentTransactions() {
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  
  useEffect(() => {
    getRecentTransactionsAction().then(setTransactions);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Your 5 most recent sales and purchases.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client/Description</TableHead>
              <TableHead className="hidden sm:table-cell">Type</TableHead>
              <TableHead className="hidden sm:table-cell">Product/Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length > 0 ? (
              transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="hidden h-9 w-9 sm:flex">
                        <AvatarImage src={transaction.clientAvatarUrl} alt="Avatar" />
                        <AvatarFallback>{transaction.clientName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="font-medium">{transaction.clientName}</div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge className="text-xs" variant={transaction.type === 'Income' ? 'default' : 'destructive'}>
                      {transaction.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{transaction.product}</TableCell>
                  <TableCell className={`text-right font-medium ${transaction.type === 'Income' ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.type === 'Income' ? '+' : ''}
                      ${transaction.amount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </TableCell>
                </TableRow>
              ))
            ) : (
                <TableRow>
                    <TableCell colSpan={4} className="text-center">No transactions yet.</TableCell>
                </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
