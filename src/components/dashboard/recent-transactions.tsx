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
import { transactions } from '@/lib/data';

export default function RecentTransactions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>A list of your most recent sales and purchases.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead className="hidden sm:table-cell">Type</TableHead>
              <TableHead className="hidden sm:table-cell">Product</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
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
                <TableCell className="text-right">
                    {transaction.type === 'Income' ? '+' : '-'}
                    ${Math.abs(transaction.amount).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
