'use client';

import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { clients } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';

export default function ClientsPage() {
  const { toast } = useToast();

  function handleAddClient() {
    toast({
      title: "Feature coming soon",
      description: "The ability to add a new client is not yet implemented.",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline">Client Management</h1>
        <Button onClick={handleAddClient}>
          <PlusCircle className="mr-2 h-5 w-5" /> Add Client
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Clients</CardTitle>
          <CardDescription>Manage your clients and view their purchase history.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead className="hidden md:table-cell">Company</TableHead>
                <TableHead className="hidden md:table-cell">Country</TableHead>
                <TableHead className="hidden md:table-cell">Last Purchase</TableHead>
                <TableHead className="text-right">Total Sales</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="font-medium">{client.name}</div>
                    <div className="hidden text-sm text-muted-foreground md:inline">
                      {client.email}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{client.company}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline">{client.country}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">{client.lastPurchaseDate}</TableCell>
                  <TableCell className="text-right">${client.totalSales.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
