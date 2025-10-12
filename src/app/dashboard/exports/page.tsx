'use client';

import { PlusCircle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { exports as initialExports } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export default function ExportsPage() {
  const { toast } = useToast();
  const [exports, setExports] = useState(initialExports);
  const [isDialogOpen, setDialogOpen] = useState(false);

  function handleAddExportOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const newExport = {
      id: (exports.length + 1).toString(),
      buyerName: formData.get('buyerName') as string,
      country: formData.get('country') as string,
      port: formData.get('port') as string,
      value: parseFloat(formData.get('value') as string),
      date: new Date().toISOString().split('T')[0],
    };
    setExports([...exports, newExport]);
    setDialogOpen(false);
    toast({
      title: "Export Order Added",
      description: `Order for ${newExport.buyerName} has been successfully added.`,
    });
  }
  
  const handleGeneratePdf = () => {
    const doc = new jsPDF();
    
    doc.setFont('Playfair Display', 'bold');
    doc.setFontSize(22);
    doc.text('HuskTrack Export Report', 14, 22);
    doc.setFont('PT Sans', 'normal');
    doc.setFontSize(12);
    doc.text(`For SK Traders`, 14, 30);
    doc.text(`Generated on: ${format(new Date(), 'PPP')}`, 14, 36);

    const tableData = exports.map((exp) => [
      exp.buyerName,
      exp.country,
      exp.port,
      format(new Date(exp.date), 'PP'),
      `$${exp.value.toLocaleString()}`
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Buyer Name', 'Country', 'Port', 'Date', 'Value']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [40, 50, 80] },
    });

    doc.save(`HuskTrack-Export-Report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);

    toast({
        title: "PDF Generated",
        description: "Your export report has been successfully downloaded.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline">Export Management</h1>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-5 w-5" /> Add Export Order
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
                    <Label htmlFor="buyerName">Buyer Name</Label>
                    <Input id="buyerName" name="buyerName" placeholder="e.g., Euro Garden Supplies" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Input id="country" name="country" placeholder="e.g., Germany" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="port">Port</Label>
                    <Input id="port" name="port" placeholder="e.g., Hamburg" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="value">Value ($)</Label>
                    <Input id="value" name="value" type="number" placeholder="45000" required />
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
      </div>
      <Card>
        <CardHeader>
          <CardTitle>International Buyers</CardTitle>
          <CardDescription>Record and manage your export orders.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Buyer Name</TableHead>
                <TableHead className="hidden md:table-cell">Country</TableHead>
                <TableHead className="hidden md:table-cell">Port</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="text-right">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exports.map((exp) => (
                <TableRow key={exp.id}>
                  <TableCell>
                    <div className="font-medium">{exp.buyerName}</div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline">{exp.country}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{exp.port}</TableCell>
                  <TableCell className="hidden md:table-cell">{format(new Date(exp.date), 'PP')}</TableCell>
                  <TableCell className="text-right">${exp.value.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
