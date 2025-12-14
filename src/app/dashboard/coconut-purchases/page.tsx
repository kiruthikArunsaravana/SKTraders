'use client';

import { PlusCircle, Download, Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { format, isWithinInterval } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { CoconutPurchase, Client, PaymentStatus } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, query, orderBy, Timestamp, doc, runTransaction, writeBatch } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const paymentStatuses: PaymentStatus[] = ['Pending', 'Paid'];

export default function CoconutPurchasesPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<PaymentStatus | 'all'>('all');

  const firestore = useFirestore();

  const purchasesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'coconut_purchases'), orderBy('date', 'desc'));
  }, [firestore]);

  const clientsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'clients'));
  }, [firestore]);

  const { data: purchases, isLoading: isLoadingPurchases } = useCollection<CoconutPurchase>(purchasesQuery);
  const { data: clients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);

  const filteredPurchases = useMemo(() => {
    if (!purchases) return [];
    
    return purchases.filter(p => {
      const isInDateRange = (() => {
        if (!dateRange?.from) return true;
        const from = dateRange.from;
        const to = dateRange.to ? new Date(dateRange.to) : new Date(from);
        to.setHours(23, 59, 59, 999);
        const purchaseDate = p.date.toDate();
        return isWithinInterval(purchaseDate, { start: from, end: to });
      })();

      const hasPaymentStatus = paymentStatusFilter === 'all' || p.paymentStatus === paymentStatusFilter;
      
      return isInDateRange && hasPaymentStatus;
    });
  }, [purchases, dateRange, paymentStatusFilter]);

  const totalValue = useMemo(() => {
    return filteredPurchases.reduce((acc, p) => acc + (p.quantity * p.price), 0);
  }, [filteredPurchases]);

  async function handleAddPurchase(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available.' });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const clientId = formData.get('clientId') as string;
    const quantity = parseFloat(formData.get('quantity') as string);
    const price = parseFloat(formData.get('price') as string);
    const paymentStatus = formData.get('paymentStatus') as PaymentStatus;

    if (!clientId || !quantity || !price || !paymentStatus) {
       toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill out all fields correctly.' });
       return;
    }
    
    const client = clients?.find(c => c.id === clientId);
    if (!client) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selected client not found.' });
      return;
    }

    const purchaseDate = Timestamp.now();
    
    const newPurchaseData: Omit<CoconutPurchase, 'id'> = {
      clientId: client.id,
      clientName: client.companyName,
      quantity,
      price,
      date: purchaseDate,
      paymentStatus,
    };
    
    const totalAmount = quantity * price;

    try {
        const batch = writeBatch(firestore);

        // 1. Add purchase document
        const purchaseRef = doc(collection(firestore, 'coconut_purchases'));
        batch.set(purchaseRef, newPurchaseData);

        // 2. Add financial transaction for the expense
        const transactionRef = doc(collection(firestore, 'financial_transactions'));
        batch.set(transactionRef, {
            type: 'expense',
            amount: -totalAmount,
            description: `Purchase of ${quantity} coconuts from ${client.companyName}`,
            category: 'Coconut',
            date: purchaseDate,
            clientName: client.companyName,
            quantity: quantity,
        });

        // 3. Update coconut stock
        const productRef = doc(firestore, 'products', 'coconut');
        const productDoc = await runTransaction(firestore, async (transaction) => {
            const doc = await transaction.get(productRef);
            if (!doc.exists()) {
                transaction.set(productRef, { quantity: quantity, name: "Coconut", costPrice: 10, sellingPrice: 15, modifiedDate: purchaseDate });
                return;
            }
            const currentQuantity = doc.data().quantity || 0;
            transaction.update(productRef, { quantity: currentQuantity + quantity, modifiedDate: purchaseDate });
        });

        await batch.commit();

        setAddDialogOpen(false);
        (event.target as HTMLFormElement).reset();
        toast({
          title: "Coconut Purchase Added",
          description: `Purchase from ${client.companyName} recorded, expense created, and stock updated.`,
        });

    } catch (error: any) {
        console.error("Failed to add coconut purchase:", error);
        toast({
            variant: 'destructive',
            title: 'Operation Failed',
            description: 'Could not save the purchase and update stock. Please try again.'
        });
    }
  }
  
  const statusBadgeVariant = (status: PaymentStatus) => {
    switch (status) {
        case 'Paid': return 'default';
        case 'Pending': return 'destructive';
        default: return 'outline';
    }
  }
  
  const isLoading = isLoadingPurchases || isLoadingClients;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <h1 className="text-3xl font-headline">Coconut Purchases</h1>
        <div className="flex gap-2 flex-wrap justify-end">
           <Popover>
              <PopoverTrigger asChild>
                <Button variant={'outline'} className={cn('w-full sm:w-[280px] justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (dateRange.to ? <>{format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}</> : format(dateRange.from, 'LLL dd, y')) : <span>Filter by date...</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar initialFocus mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
              </PopoverContent>
            </Popover>
            <Select value={paymentStatusFilter} onValueChange={(value) => setPaymentStatusFilter(value as PaymentStatus | 'all')}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by payment..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                {paymentStatuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Purchase Records</CardTitle>
            <CardDescription>
              Track all your coconut purchases. Showing {filteredPurchases.length} record(s).
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-5 w-5" /> Add Purchase
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Coconut Purchase</DialogTitle>
                <DialogDescription>
                  Enter the details of the new purchase. This will create an expense and increase stock.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddPurchase}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                      <Label htmlFor="clientId">Client</Label>
                      <Select name="clientId" required>
                          <SelectTrigger>
                              <SelectValue placeholder="Select a client" />
                          </SelectTrigger>
                          <SelectContent>
                              {isLoadingClients ? <SelectItem value="loading" disabled>Loading clients...</SelectItem> :
                              clients?.map(client => (
                                  <SelectItem key={client.id} value={client.id}>{client.companyName}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity (pieces)</Label>
                    <Input id="quantity" name="quantity" type="number" placeholder="e.g., 10000" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price Per Piece</Label>
                    <Input id="price" name="price" type="number" step="0.01" placeholder="e.g., 12.50" required />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="paymentStatus">Payment Status</Label>
                      <Select name="paymentStatus" defaultValue="Pending" required>
                          <SelectTrigger>
                              <SelectValue placeholder="Select payment status" />
                          </SelectTrigger>
                          <SelectContent>
                              {paymentStatuses.map(status => (
                                  <SelectItem key={status} value={status}>{status}</SelectItem>
                              ))}
                          </SelectContent>
                      </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">Add Purchase</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="hidden sm:table-cell">Quantity</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="hidden md:table-cell">Payment</TableHead>
                <TableHead className="text-right">Total Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                  <>
                    <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                    <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  </>
              )}
              {!isLoading && filteredPurchases.length > 0 ? (
                filteredPurchases.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="font-medium">{p.clientName}</div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{p.quantity.toLocaleString()} pcs</TableCell>
                    <TableCell className="hidden md:table-cell">{format(p.date.toDate(), 'PP')}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={statusBadgeVariant(p.paymentStatus)}>{p.paymentStatus}</Badge>
                    </TableCell>
                    <TableCell className="text-right">${(p.quantity * p.price).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              ) : !isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    No purchases match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
