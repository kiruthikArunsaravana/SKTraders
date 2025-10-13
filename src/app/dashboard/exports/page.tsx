'use client';

import { PlusCircle, Download, Calendar as CalendarIcon, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';
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
import type { Export, ExportStatus } from '@/lib/types';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, query, orderBy, Timestamp, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const exportStatuses: ExportStatus[] = ['To-do', 'In Progress', 'Completed'];

export default function ExportsPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedExport, setSelectedExport] = useState<Export | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [statusFilter, setStatusFilter] = useState<ExportStatus | 'all'>('all');

  const firestore = useFirestore();

  const exportsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'exports'), orderBy('exportDate', 'desc'));
  }, [firestore]);

  const { data: exports, isLoading } = useCollection<Export>(exportsQuery);

  const filteredExports = useMemo(() => {
    if (!exports) return [];
    
    return exports.filter(exp => {
      // Date range filter
      const isInDateRange = (() => {
        if (!dateRange?.from) return true; // No start date, include all
        const from = dateRange.from;
        // If no end date, use start date for a single day filter
        const to = dateRange.to ? new Date(dateRange.to) : new Date(from);
        
        // Adjust 'to' date to include the entire day
        to.setHours(23, 59, 59, 999);
        
        const expDate = exp.exportDate.toDate();
        return isWithinInterval(expDate, { start: from, end: to });
      })();

      // Status filter
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
    const destinationCountry = formData.get('destinationCountry') as string;
    const destinationPort = formData.get('destinationPort') as string;
    const quantity = parseFloat(formData.get('quantity') as string);
    const status = formData.get('status') as ExportStatus;
    const invoiceNumber = formData.get('invoiceNumber') as string;
    
    if (!clientId || !destinationCountry || !destinationPort || !quantity || !status || !invoiceNumber) {
       toast({ variant: 'destructive', title: 'Validation Error', description: 'Please fill out all fields correctly.' });
       return;
    }
    
    const exportsCollection = collection(firestore, 'exports');
    const newExportData = {
      clientId,
      destinationCountry,
      destinationPort,
      quantity,
      exportDate: Timestamp.now(),
      status,
      invoiceNumber,
      productId: 'coco-pith', // Defaulting to coco-pith for now
    };
    
    addDocumentNonBlocking(exportsCollection, newExportData);

    setAddDialogOpen(false);
    (event.target as HTMLFormElement).reset();
    toast({
      title: "Export Order Added",
      description: `Order for ${clientId} has been successfully added.`,
    });
  }

  const handleEditStatus = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!firestore || !selectedExport) {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not update status.' });
        return;
    }
    const formData = new FormData(event.currentTarget);
    const status = formData.get('status') as ExportStatus;

    if (!status) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a status.' });
        return;
    }

    const exportRef = doc(firestore, 'exports', selectedExport.id);
    updateDocumentNonBlocking(exportRef, { status });

    setEditDialogOpen(false);
    setSelectedExport(null);
    toast({
        title: "Status Updated",
        description: `Order status has been updated to "${status}".`,
    });
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
      exp.clientId,
      exp.destinationCountry,
      exp.destinationPort,
      format(exp.exportDate.toDate(), 'PP'),
      exp.status,
      `$${exp.quantity.toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Client', 'Country', 'Port', 'Date', 'Status', 'Value']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [40, 50, 80] },
    });
    
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFont('PT Sans', 'bold');
    doc.setFontSize(14);
    doc.text(`Total Export Value: $${totalValue.toLocaleString()}`, 14, finalY);

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
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Export Order</DialogTitle>
                  <DialogDescription>
                    Enter the details of the new export order.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddExportOrder}>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="clientId">Client ID</Label>
                      <Input id="clientId" name="clientId" placeholder="e.g., Euro Garden Supplies" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="destinationCountry">Country</Label>
                      <Input id="destinationCountry" name="destinationCountry" placeholder="e.g., Germany" required />
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
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Value ($)</Label>
                      <Input id="quantity" name="quantity" type="number" placeholder="45000" required />
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
                <TableHead className="hidden sm:table-cell">Destination</TableHead>
                <TableHead className="hidden md:table-cell">Status</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right">Value</TableHead>
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
              {!isLoading && filteredExports.length > 0 ? (
                filteredExports.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell>
                      <div className="font-medium">{exp.clientId}</div>
                      <div className="hidden text-sm text-muted-foreground md:inline">
                        INV: {exp.invoiceNumber}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {exp.destinationCountry} ({exp.destinationPort})
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={statusBadgeVariant(exp.status)}>{exp.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{format(exp.exportDate.toDate(), 'PP')}</TableCell>
                    <TableCell className="text-right">${exp.quantity.toLocaleString()}</TableCell>
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
                  <TableCell colSpan={6} className="text-center">
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
              Update the status for the order for client {selectedExport?.clientId}.
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
