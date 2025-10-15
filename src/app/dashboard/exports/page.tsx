'use client';

import { PlusCircle, Download, Calendar as CalendarIcon, Edit } from 'lucide-react';
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
import type { Export, ExportStatus, Client, Product } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, query, orderBy, Timestamp, doc, where, runTransaction } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { initialProducts } from '@/lib/data';

const exportStatuses: ExportStatus[] = ['To-do', 'In Progress', 'Completed'];

export default function ExportsPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedExport, setSelectedExport] = useState<Export | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [statusFilter, setStatusFilter] = useState<ExportStatus | 'all'>('all');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [destinationCountry, setDestinationCountry] = useState('');


  const firestore = useFirestore();

  const exportsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'exports'), orderBy('exportDate', 'desc'));
  }, [firestore]);

  const internationalClientsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'clients'), where('clientType', '==', 'international'));
  }, [firestore]);
  
  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'products'), orderBy('name', 'asc'));
  }, [firestore]);

  const { data: exports, isLoading: isLoadingExports } = useCollection<Export>(exportsQuery);
  const { data: internationalClients, isLoading: isLoadingClients } = useCollection<Client>(internationalClientsQuery);
  const { data: dbProducts, isLoading: isLoadingProducts } = useCollection<Product>(productsQuery);

  const products = useMemo(() => {
    const initialProductMap = new Map<string, Product>(initialProducts.map(p => [p.id, { ...p }]));
    
    if (dbProducts) {
      dbProducts.forEach(dbProduct => {
        if (initialProductMap.has(dbProduct.id)) {
          const initialProduct = initialProductMap.get(dbProduct.id)!;
          initialProduct.quantity = dbProduct.quantity;
        } else {
           initialProductMap.set(dbProduct.id, dbProduct);
        }
      });
    }

    return Array.from(initialProductMap.values());
  }, [dbProducts]);


  const productsMap = useMemo(() => {
    return new Map(products.map(p => [p.id, p]));
  }, [products]);

  useEffect(() => {
    if (selectedClientId && internationalClients) {
      const client = internationalClients.find(c => c.id === selectedClientId);
      if (client) {
        setDestinationCountry(client.country);
      }
    } else {
      setDestinationCountry('');
    }
  }, [selectedClientId, internationalClients]);

  const filteredExports = useMemo(() => {
    if (!exports) return [];
    
    return exports.filter(exp => {
      const isInDateRange = (() => {
        if (!dateRange?.from) return true;
        const from = dateRange.from;
        const to = dateRange.to ? new Date(dateRange.to) : new Date(from);
        to.setHours(23, 59, 59, 999);
        const expDate = exp.exportDate.toDate();
        return isWithinInterval(expDate, { start: from, end: to });
      })();

      const hasStatus = statusFilter === 'all' || exp.status === statusFilter;
      
      return isInDateRange && hasStatus;
    });
  }, [exports, dateRange, statusFilter]);

  const totalValue = useMemo(() => {
    return filteredExports.reduce((acc, exp) => acc + exp.quantity, 0);
  }, [filteredExports]);


  async function handleAddExportOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
     if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available.' });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const clientId = formData.get('clientId') as string;
    const country = formData.get('destinationCountry') as string;
    const destinationPort = formData.get('destinationPort') as string;
    const quantity = parseFloat(formData.get('quantity') as string);
    const status = formData.get('status') as ExportStatus;
    const invoiceNumber = formData.get('invoiceNumber') as string;
    const productId = formData.get('productId') as string;
    
    if (!clientId || !country || !destinationPort || !quantity || !status || !invoiceNumber || !productId) {
       toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill out all fields correctly.' });
       return;
    }
    
    const client = internationalClients?.find(c => c.id === clientId);
    if (!client) {
      toast({ variant: 'destructive', title: 'Error', description: 'Selected client not found.' });
      return;
    }

    const exportsCollection = collection(firestore, 'exports');
    const newExportData = {
      clientId: client.id,
      clientName: client.companyName,
      destinationCountry: country,
      destinationPort,
      quantity,
      exportDate: Timestamp.now(),
      status,
      invoiceNumber,
      productId,
    };
    
    addDocumentNonBlocking(exportsCollection, newExportData);

    setAddDialogOpen(false);
    (event.target as HTMLFormElement).reset();
    setSelectedClientId('');
    setDestinationCountry('');
    toast({
      title: "Export Order Added",
      description: `Order for ${newExportData.clientName} has been successfully added.`,
    });
  }

  const handleEditStatus = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firestore || !selectedExport) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update status.' });
        return;
    }
    const formData = new FormData(event.currentTarget);
    const newStatus = formData.get('status') as ExportStatus;

    if (!newStatus) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a status.' });
        return;
    }

    const exportRef = doc(firestore, 'exports', selectedExport.id);

    // If status is changing to 'Completed', update stock
    if (newStatus === 'Completed' && selectedExport.status !== 'Completed') {
      const productRef = doc(firestore, 'products', selectedExport.productId);
      
      try {
        await runTransaction(firestore, async (transaction) => {
          const productDoc = await transaction.get(productRef);
          if (!productDoc.exists()) {
            throw "Product document does not exist!";
          }

          const currentQuantity = productDoc.data().quantity;
          if (currentQuantity < selectedExport.quantity) {
             throw `Cannot complete order, insufficient stock. Only ${currentQuantity} units available.`;
          }

          const newQuantity = currentQuantity - selectedExport.quantity;
          transaction.update(productRef, { quantity: newQuantity });
          transaction.update(exportRef, { status: newStatus });
        });
        
        toast({
            title: "Status Updated & Stock Reduced",
            description: `Order status updated to "Completed" and stock has been adjusted.`,
        });

      } catch (error: any) {
        console.error("Transaction failed: ", error);
        toast({ variant: 'destructive', title: 'Error', description: typeof error === 'string' ? error : 'Failed to update status and stock.' });
        return;
      }
    } else {
       updateDocumentNonBlocking(exportRef, { status: newStatus });
       toast({
          title: "Status Updated",
          description: `Order status has been updated to "${newStatus}".`,
      });
    }

    setEditDialogOpen(false);
    setSelectedExport(null);
  };

  
  const handleGeneratePdf = () => {
    if (filteredExports.length === 0) {
        toast({
            variant: "destructive",
            title: "No Data",
            description: "There are no export orders matching your current filters.",
        });
        return;
    }
    const doc = new jsPDF();
    
    doc.setFont('Playfair Display', 'bold');
    doc.setFontSize(22);
    doc.text('HuskTrack Export Report', 14, 22);
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

    const tableData = filteredExports.map((exp) => [
      exp.clientName,
      productsMap.get(exp.productId as any)?.name || 'N/A',
      exp.destinationCountry,
      format(exp.exportDate.toDate(), 'PP'),
      exp.status,
      `${exp.quantity.toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Client', 'Product', 'Country', 'Date', 'Status', 'Quantity']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [40, 50, 80] },
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('PT Sans', 'bold');
    doc.setFontSize(14);
    doc.text(`Total Export Quantity: ${totalValue.toLocaleString()}`, 14, finalY);

    doc.save(`HuskTrack-Export-Report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

    toast({
        title: "PDF Generated",
        description: "Your export report has been successfully downloaded.",
    });
  };

  const statusBadgeVariant = (status: ExportStatus) => {
    switch (status) {
        case 'Completed': return 'default';
        case 'In Progress': return 'secondary';
        case 'To-do': return 'destructive';
        default: return 'outline';
    }
  }
  
  const isLoading = isLoadingExports || isLoadingClients || isLoadingProducts;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-2 flex-wrap">
        <h1 className="text-3xl font-headline">Export Management</h1>
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
             <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as ExportStatus | 'all')}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {exportStatuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>International Buyers</CardTitle>
            <CardDescription>Record and manage your export orders.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddDialogOpen} onOpenChange={setAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-5 w-5" /> Add Order
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Add New Export Order</DialogTitle>
                  <DialogDescription>
                    Enter the details of the new export order.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddExportOrder}>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="clientId">Client</Label>
                        <Select name="clientId" required onValueChange={setSelectedClientId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select an international client" />
                            </SelectTrigger>
                            <SelectContent>
                                {isLoadingClients ? <SelectItem value="loading" disabled>Loading clients...</SelectItem> :
                                internationalClients?.map(client => (
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
                                    <SelectItem key={product.id} value={product.id}>{product.name} ({product.quantity} avail.)</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="destinationCountry">Country</Label>
                      <Input id="destinationCountry" name="destinationCountry" value={destinationCountry} onChange={(e) => setDestinationCountry(e.target.value)} placeholder="e.g., Germany" required readOnly/>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="destinationPort">Port</Label>
                      <Input id="destinationPort" name="destinationPort" placeholder="e.g., Hamburg" required />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select name="status" defaultValue="To-do" required>
                            <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                {exportStatuses.map(status => (
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
                      <Input id="quantity" name="quantity" type="number" placeholder="5000" required />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit">Add Order</Button>
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
                <TableHead className="hidden sm:table-cell">Destination</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                  <>
                    <TableRow><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                    <TableRow><TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  </>
              )}
              {!isLoading && filteredExports.length > 0 ? (
                filteredExports.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell>
                      <div className="font-medium">{exp.clientName}</div>
                      <div className="hidden text-sm text-muted-foreground md:inline">
                        INV: {exp.invoiceNumber}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {productsMap.get(exp.productId as any)?.name || 'N/A'}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {exp.destinationCountry} ({exp.destinationPort})
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={statusBadgeVariant(exp.status)}>{exp.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{format(exp.exportDate.toDate(), 'PP')}</TableCell>
                    <TableCell className="text-right">{exp.quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => { setSelectedExport(exp); setEditDialogOpen(true); }}>
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit Status</span>
                        </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : !isLoading && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    No export orders match your filters.
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
            <DialogTitle>Edit Order Status</DialogTitle>
            <DialogDescription>
              Update the status for the order for client {selectedExport?.clientName}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditStatus}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select name="status" defaultValue={selectedExport?.status} required>
                  <SelectTrigger id="edit-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {exportStatuses.map(status => (
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
