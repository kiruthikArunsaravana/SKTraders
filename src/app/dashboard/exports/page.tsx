'use client';

import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { exports } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

export default function ExportsPage() {
  const { toast } = useToast();

  function handleAddExportOrder() {
    toast({
      title: "Feature coming soon",
      description: "The ability to add a new export order is not yet implemented.",
    });
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline">Export Management</h1>
        <Button onClick={handleAddExportOrder}>
          <PlusCircle className="mr-2 h-5 w-5" /> Add Export Order
        </Button>
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
                  <TableCell className="hidden md:table-cell">{exp.date}</TableCell>
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
