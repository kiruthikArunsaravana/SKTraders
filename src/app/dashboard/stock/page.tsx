'use client';

import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gem, Wind, Box } from 'lucide-react';
import type { Product } from '@/lib/types';
import { initialProducts } from '@/lib/data';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, doc, runTransaction } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';

const productIcons = {
    'coco-pith': Box,
    'coir-fiber': Wind,
    'husk-chips': Gem,
};

export default function StockPage() {
  const { toast } = useToast();
  const [isDialogOpen, setDialogOpen] = useState(false);

  const firestore = useFirestore();

  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'products'), orderBy('name', 'asc'));
  }, [firestore]);

  const { data: products, isLoading } = useCollection<Omit<Product, 'id' | 'icon'>>(productsQuery);

  const productsWithIcons = useMemo(() => {
    // Start with the static initialProducts to ensure the UI has something to show even before Firestore loads
    const productMap = new Map<string, Product>(initialProducts.map(p => [p.id, p]));

    // Update with data from Firestore once it loads
    if (products) {
      products.forEach(dbProduct => {
        const existingProduct = productMap.get(dbProduct.id);
        if (existingProduct) {
          productMap.set(dbProduct.id, { ...existingProduct, ...dbProduct });
        }
      });
    }
    
    return Array.from(productMap.values()).map(p => ({
      ...p,
      icon: productIcons[p.id as keyof typeof productIcons] || Box
    }));

  }, [products]);


  async function handleAddStock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available.' });
      return;
    }

    const formData = new FormData(event.currentTarget);
    const productId = formData.get('product') as string;
    const quantity = parseInt(formData.get('quantity') as string, 10);
    
    if (!productId || isNaN(quantity) || quantity <= 0) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a product and enter a positive quantity.' });
        return;
    }
    
    const productRef = doc(firestore, 'products', productId);
    const staticProductData = initialProducts.find(p => p.id === productId);
    if (!staticProductData) {
        toast({ variant: 'destructive', title: 'Error', description: 'Invalid product selected.' });
        return;
    }
    
    try {
        await runTransaction(firestore, async (transaction) => {
            const productDoc = await transaction.get(productRef);
            if (!productDoc.exists()) {
                // If doc doesn't exist, create it with the new quantity.
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { icon, ...dbProduct } = staticProductData;
                transaction.set(productRef, {
                    ...dbProduct,
                    quantity: quantity,
                });
            } else {
                // If doc exists, update the quantity.
                const currentQuantity = productDoc.data().quantity || 0;
                const newQuantity = currentQuantity + quantity;
                transaction.update(productRef, { quantity: newQuantity });
            }
        });

        setDialogOpen(false);
        (event.target as HTMLFormElement).reset();
        toast({
          title: "Stock Added",
          description: `${quantity} units have been added to ${staticProductData.name}.`,
        });

    } catch (error) {
         toast({
            variant: 'destructive',
            title: 'Error updating stock',
            description: (error as Error).message || 'An unknown error occurred',
        });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline">Stock Management</h1>
        <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-5 w-5" /> Add Stock
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Stock Entry</DialogTitle>
              <DialogDescription>
                Add a new quantity for an existing product.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddStock}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="product">Product</Label>
                   <Select name="product" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {initialProducts.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input id="quantity" name="quantity" type="number" placeholder="0" required />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Add Stock</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Product Stock</CardTitle>
          <CardDescription>Track quantity, cost, and selling prices for your products.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="hidden md:table-cell">Available Quantity</TableHead>
                <TableHead className="hidden md:table-cell">Cost Price</TableHead>
                <TableHead className="text-right">Selling Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                  <>
                    <TableRow><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                    <TableRow><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                    <TableRow><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  </>
              )}
              {!isLoading && productsWithIcons.map((product) => {
                const Icon = product.icon || Box;
                return (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Icon className="h-6 w-6 text-muted-foreground" />
                        <div className="font-medium">{product.name}</div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                        <span>{product.quantity.toLocaleString()} units</span>
                        <Progress value={(product.quantity / 2000) * 100} className="w-24 h-2" />
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">${product.costPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${product.sellingPrice.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && productsWithIcons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center">No products found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
