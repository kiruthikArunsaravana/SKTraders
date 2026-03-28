'use client';

import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gem, Wind, Box, Circle } from 'lucide-react';
import type { Product } from '@/lib/types';
import { initialProducts } from '@/lib/data';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

const productIcons = {
    'coco-pith': Box,
    'coir-fiber': Wind,
    'husk-chips': Gem,
    'coconut': Circle,
    'copra': Circle
};

export default function StockPage() {
  const { toast } = useToast();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch('/api/products');
        if (res.ok) {
          const data = await res.json();
          setProducts(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);


  const productsWithIcons = useMemo(() => {
    const initialProductMap = new Map<string, Product>(initialProducts.map(p => [p.id, { ...p }]));
    
    if (products) {
      products.forEach(dbProduct => {
        if (initialProductMap.has(dbProduct.id)) {
          const initialProduct = initialProductMap.get(dbProduct.id)!;
          initialProduct.quantity = dbProduct.quantity;
          initialProduct.modifiedDate = dbProduct.modifiedDate;
        } else {
           initialProductMap.set(dbProduct.id, dbProduct);
        }
      });
    }

    return Array.from(initialProductMap.values()).map(p => ({
      ...p,
      icon: productIcons[p.id as keyof typeof productIcons] || Box
    }));

  }, [products]);


  async function handleAddStock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const productId = formData.get('product') as string;
    const quantity = parseInt(formData.get('quantity') as string, 10);

    if (!productId || isNaN(quantity) || quantity <= 0) {
        toast({ variant: 'destructive', title: 'Validation Error', description: 'Please select a product and enter a positive quantity.' });
        return;
    }

    const staticProductData = initialProducts.find(p => p.id === productId);
    if (!staticProductData) {
        toast({ variant: 'destructive', title: 'Error', description: 'Invalid product selected.' });
        return;
    }

    try {
        const res = await fetch('/api/products/add-stock', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId, quantity }) });
        if (!res.ok) throw new Error('Failed to update stock');

        setDialogOpen(false);
        (event.target as HTMLFormElement).reset();
        toast({
          title: "Stock Added",
          description: `${quantity} units have been added to ${staticProductData.name}.`,
        });

        // Refresh products after adding stock
        const fetchRes = await fetch('/api/products');
        if (fetchRes.ok) {
          const data = await fetchRes.json();
          setProducts(Array.isArray(data) ? data : []);
        }

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
                <TableHead className="hidden md:table-cell">Last Modified</TableHead>
                <TableHead className="hidden md:table-cell">Cost Price</TableHead>
                <TableHead className="text-right">Selling Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                  <>
                    <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                    <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                    <TableRow><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  </>
              )}
              {!isLoading && productsWithIcons.map((product) => {
                const Icon = product.icon || Box;
                const maxQuantity = product.id === 'coconut' ? 50000 : 2000;
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
                        <Progress value={(product.quantity / maxQuantity) * 100} className="w-24 h-2" />
                      </div>
                    </TableCell>
                     <TableCell className="hidden md:table-cell" suppressHydrationWarning>
                        {product.modifiedDate ? format(new Date(product.modifiedDate), 'PP pp') : 'N/A'}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">${product.costPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${product.sellingPrice.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
              {!isLoading && productsWithIcons.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No products found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
