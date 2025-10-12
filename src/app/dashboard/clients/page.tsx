'use client';

import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { addClientAction, getClientsAction } from './actions';
import type { Client } from '@/lib/types';

export default function ClientsPage() {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [isDialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    // This fetches the initial client data from your server when the page loads.
    // The `getClientsAction` function is where you'd put your database select query.
    async function loadClients() {
      const initialClients = await getClientsAction();
      setClients(initialClients);
    }
    loadClients();
  }, []);


  async function handleAddClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    
    // The Server Action handles the backend logic, including database insertion.
    const result = await addClientAction(formData);

    if (result.success && result.newClient) {
        // Update the UI with the new client returned from the server.
        setClients(prevClients => [...prevClients, result.newClient!]);
        setDialogOpen(false);
        toast({
          title: "Client Added",
          description: `${result.newClient.name} has been successfully added.`,
        });
    } else {
         toast({
            variant: "destructive",
            title: "Error",
            description: Array.isArray(result.error) ? result.error.join(', ') : (result.error as string || "Could not add client."),
        });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline">Client Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-5 w-5" /> Add Client
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Enter the details of the new client.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddClient}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" placeholder="John Doe" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" placeholder="john@example.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" name="company" placeholder="Acme Inc." required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" name="country" placeholder="USA" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Add Client</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
