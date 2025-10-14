'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import type { FinancialTransaction } from '@/lib/types';
import { collection, query, orderBy, limit } from 'firebase/firestore';
import { Skeleton } from '../ui/skeleton';
import { placeholderImages } from '@/lib/placeholder-images.json';
import { Badge } from '../ui/badge';


export default function RecentTransactions() {
  const firestore = useFirestore();

  const transactionsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'financial_transactions'), orderBy('date', 'desc'), limit(5));
  }, [firestore]);

  const { data: transactions, isLoading } = useCollection<FinancialTransaction>(transactionsQuery);
  const avatars = placeholderImages.filter(p => p.id.startsWith('avatar-'));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Your 5 most recent sales and purchases.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-8">
        {isLoading && (
          <>
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </>
        )}
        {!isLoading && transactions && transactions.map((transaction, index) => {
           const avatar = avatars[index % avatars.length];
           return (
            <div key={transaction.id} className="flex items-center gap-4">
              <Avatar className="hidden h-9 w-9 sm:flex">
                 <AvatarImage src={avatar.imageUrl} alt="Avatar" data-ai-hint={avatar.imageHint} />
                 <AvatarFallback>AV</AvatarFallback>
              </Avatar>
              <div className="grid gap-1">
                <p className="text-sm font-medium leading-none">{transaction.description}</p>
                <p className="text-sm text-muted-foreground">{transaction.category}</p>
              </div>
              <div className="ml-auto font-medium">
                  <Badge variant={transaction.type === 'income' ? 'default' : 'destructive'}>
                     {transaction.type}
                  </Badge>
              </div>
            </div>
           )
        })}
         {!isLoading && (!transactions || transactions.length === 0) && (
            <p className="text-sm text-muted-foreground text-center">No transactions found.</p>
        )}
      </CardContent>
    </Card>
  );
}
