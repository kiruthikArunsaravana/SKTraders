'use client';

import { PlusCircle, Download, Calendar as CalendarIcon, Edit, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, isWithinInterval } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import type { LocalSale, SaleStatus, Client, Product } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, query, orderBy, Timestamp, doc, where, runTransaction } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const saleStatuses: SaleStatus[] = ['To-do', 'In Progress', 'Completed'];

export default function LocalSalesPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedSale, setSelectedSale] = useState<LocalSale | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [statusFilter, setStatusFilter] = useState<SaleStatus | 'all'>('all');
  const [selectedClientId, setSelectedClientId] = useState<string>('');


  const firestore = useFirestore();

  const salesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'local_sales'), orderBy('saleDate', 'desc'));
  }, [firestore]);

  const localClientsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'clients'), where('clientType', '==', 'local'));
  }, [firestore]);

  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'products'));
  }, [firestore]);

  const { data: sales, isLoading: isLoadingSales } = useCollection<LocalSale>(salesQuery);
  const { data: localClients, isLoading: isLoadingClients } = useCollection<Client>(localClientsQuery);
  const { data: products, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

  const productsMap = useMemo(() => {
    if (!products) return new Map<string, Product>();
    return new Map(products.map(p => [p.id, p]));
  }, [products]);

  const filteredSales = useMemo(() => {
    if (!sales) return [];
    
    return sales.filter(sale => {
      const isInDateRange = (() => {
        if (!dateRange?.from) return true;
        const from = dateRange.from;
        const to = dateRange.to ? new Date(dateRange.to) : new Date(from);
        to.setHours(23, 59, 59, 999);
        const saleDate = sale.saleDate.toDate();
        return isWithinInterval(saleDate, { start: from, end: to });
      })();

      const hasStatus = statusFilter === 'all' || sale.status === statusFilter;
      
      return isInDateRange && hasStatus;
    });
  }, [sales, dateRange, statusFilter]);

  const totalValue = useMemo(() => {
    return filteredSales.reduce((acc, sale) => acc + sale.quantity, 0);
  }, [filteredSales]);


  async function handleAddSale(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
     if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available.' });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const clientId = formData.get('clientId') as string;
    const quantity = parseFloat(formData.get('quantity') as string);
    const status = formData.get('status') as SaleStatus;
    const invoiceNumber = formData.get('invoiceNumber') as string;
    const productId = formData.get('productId') as string;
    
    if (!clientId || !quantity || !status || !invoiceNumber || !productId) {
       toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill out all fields correctly.' });
       return;
    }

    const product = productsMap.get(productId);
    if (!product || product.quantity < quantity) {
      toast({ variant: 'destructive', title: 'Stock Alert', description: 'There is only less stocks verify again' });
      return;
    }
    
    const client = localClients?.find(c => c.id === clientId);
    if (!client) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selected client not found.' });
      return;
    }

    const salesCollection = collection(firestore, 'local_sales');
    const newSaleData = {
      clientId: client.id,
      clientName: client.companyName,
      quantity,
      saleDate: Timestamp.now(),
      status,
      invoiceNumber,
      productId,
    };
    
    addDocumentNonBlocking(salesCollection, newSaleData);

    setAddDialogOpen(false);
    (event.target as HTMLFormElement).reset();
    setSelectedClientId('');
    toast({
      title: "Local Sale Added",
      description: `Sale for ${newSaleData.clientName} has been successfully added.`,
    });
  }

  const handleEditStatus = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firestore || !selectedSale) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update status.' });
        return;
    }
    const formData = new FormData(event.currentTarget);
    const newStatus = formData.get('status') as SaleStatus;

    if (!newStatus) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a status.' });
        return;
    }

    const saleRef = doc(firestore, 'local_sales', selectedSale.id);

    if (newStatus === 'Completed' && selectedSale.status !== 'Completed') {
      const productRef = doc(firestore, 'products', selectedSale.productId);
      
      try {
        await runTransaction(firestore, async (transaction) => {
          const productDoc = await transaction.get(productRef);
          if (!productDoc.exists()) {
            throw "Product document does not exist!";
          }

          const currentQuantity = productDoc.data().quantity;
          if (currentQuantity < selectedSale.quantity) {
             throw "Cannot complete sale, insufficient stock.";
          }

          const newQuantity = currentQuantity - selectedSale.quantity;
          transaction.update(productRef, { quantity: newQuantity });
          transaction.update(saleRef, { status: newStatus });
        });
        
        toast({
            title: "Status Updated & Stock Reduced",
            description: `Sale status updated to "Completed" and stock has been adjusted.`,
        });

      } catch (error: any) {
        console.error("Transaction failed: ", error);
        toast({ variant: 'destructive', title: 'Error', description: typeof error === 'string' ? error : 'Failed to update status and stock.' });
        return;
      }
    } else {
       updateDocumentNonBlocking(saleRef, { status: newStatus });
       toast({
          title: "Status Updated",
          description: `Sale status has been updated to "${newStatus}".`,
      });
    }

    setEditDialogOpen(false);
    setSelectedSale(null);
  };

  
  const handleGeneratePdf = () => {
    if (filteredSales.length === 0) {
        toast({
            variant: "destructive",
            title: "No Data",
            description: "There are no local sales matching your current filters.",
        });
        return;
    }
    const doc = new jsPDF();
    
    doc.setFont('Playfair Display', 'bold');
    doc.setFontSize(22);
    doc.text('HuskTrack Local Sales Report', 14, 22);
    doc.setFont('PT Sans', 'normal');
    doc.setFontSize(12);
    doc.text(`For SK Traders`, 14, 30);
    
    let filterDescription = `Status: ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`;
    if (dateRange?.from) {
        const toDate = dateRange.to || dateRange.from;
        filterDescription += ` | Period: ${format(dateRange.from, 'PPP')} - ${format(toDate, 'PPP')}`;
    } else {
        filterDescription += ' | Period: All Time';
    }
    doc.setFontSize(10);
    doc.text(filterDescription, 14, 36);

    const tableData = filteredSales.map((sale) => [
      sale.clientName,
      productsMap.get(sale.productId)?.name || 'N/A',
      format(sale.saleDate.toDate(), 'PP'),
      sale.status,
      `${sale.quantity.toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Client', 'Product', 'Date', 'Status', 'Quantity']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [40, 50, 80] },
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('PT Sans', 'bold');
    doc.setFontSize(14);
    doc.text(`Total Sale Quantity: ${totalValue.toLocaleString()}`, 14, finalY);

    doc.save(`HuskTrack-Local-Sales-Report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

    toast({
        title: "PDF Generated",
        description: "Your local sales report has been successfully downloaded.",
    });
  };

  const statusBadgeVariant = (status: SaleStatus) => {
    switch (status) {
        case 'Completed': return 'default';
        case 'In Progress': return 'secondary';
        case 'To-do': return 'destructive';
        default: return 'outline';
    }
  }
  
  const isLoading = isLoadingSales || isLoadingClients || isLoadingProducts;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <h1 className="text-3xl font-headline">Local Sales Management</h1>
        <div className="flex gap-2 flex-wrap justify-end">
           <Popover>
              <PopoverTrigger asChild>
                <Button variant={'outline'} className={cn('w-[280px] justify-start text-left font-normal', !dateRange && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (dateRange.to ? <>{format(dateRange.from, 'LLL dd, y')} - {format(dateRange.to, 'LLL dd, y')}</> : format(dateRange.from, 'LLL dd, y')) : <span>Filter by date...</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar initialFocus mode="range" selected={dateRange} onSelect={setDateRange} numberOfMonths={2} />
              </PopoverContent>
            </Popover>
             <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as SaleStatus | 'all')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {saleStatuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Local Buyers</CardTitle>
            <CardDescription>Record and manage your local sales orders.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-5 w-5" /> Add Sale
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Local Sale</DialogTitle>
                  <DialogDescription>
                    Enter the details of the new local sale.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddSale}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="clientId">Client</Label>
                        <Select name="clientId" required onValueChange={setSelectedClientId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a local client" />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoadingClients ? <SelectItem value="loading" disabled>Loading clients...</SelectItem> :
                                localClients?.map(client => (
                                    <SelectItem key={client.id} value={client.id}>{client.companyName}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="productId">Product</Label>
                        <Select name="productId" required>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a product" />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoadingProducts ? <SelectItem value="loading" disabled>Loading products...</SelectItem> :
                                products?.map(product => (
                                    <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select name="status" defaultValue="To-do" required>
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                {saleStatuses.map(status => (
                                    <SelectItem key={status} value={status}>{status}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="invoiceNumber">Invoice Number</Label>
                      <Input id="invoiceNumber" name="invoiceNumber" placeholder="INV-12345" required />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input id="quantity" name="quantity" type="number" placeholder="500" required />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Add Sale</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
            <Button variant="outline" onClick={handleGeneratePdf}>
              <Download className="mr-2 h-5 w-5" /> Download PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="hidden sm:table-cell">Product</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                  <>
                    <TableRow><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                    <TableRow><TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  </>
              )}
              {!isLoading && filteredSales.length > 0 ? (
                filteredSales.map((sale) => (
                  <TableRow key={sale.id}>
                    <TableCell>
                      <div className="font-medium">{sale.clientName}</div>
                      <div className="hidden text-sm text-muted-foreground md:inline">
                        INV: {sale.invoiceNumber}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {productsMap.get(sale.productId)?.name || 'N/A'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={statusBadgeVariant(sale.status)}>{sale.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{format(sale.saleDate.toDate(), 'PP')}</TableCell>
                    <TableCell className="text-right">{sale.quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => { setSelectedSale(sale); setEditDialogOpen(true); }}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit Status</span>
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : !isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">
                    No local sales match your filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Status Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Sale Status</DialogTitle>
            <DialogDescription>
              Update the status for the sale for client {selectedSale?.clientName}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditStatus}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select name="status" defaultValue={selectedSale?.status} required>
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {saleStatuses.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Update Status</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
