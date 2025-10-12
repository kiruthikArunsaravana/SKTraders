'use client';

import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Gem, Wind, Box } from 'lucide-react';
import type { Product } from '@/lib/types';
import { getProductsAction, updateStockAction } from './actions';
import { initialProducts } from '@/lib/data';


export default function StockPage() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [isDialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    async function loadProducts() {
        const dbProducts = await getProductsAction();
        // This maps the icon from the static initialProducts list to the products fetched from the db.
        const productsWithIcons = dbProducts.map(dbProd => {
            const initialProd = initialProducts.find(p => p.id === dbProd.id);
            return {
                ...dbProd,
                icon: initialProd?.icon || Box, // Default to Box icon if not found
            };
        });
        setProducts(productsWithIcons);
    }
    loadProducts();
  }, []);

  const productIcons = {
    'coco-pith': Box,
    'coir-fiber': Wind,
    'husk-chips': Gem,
  };

  async function handleAddStock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const result = await updateStockAction(formData);
    
    if (result.success && result.updatedProduct) {
        setProducts(products.map(p => 
          p.id === result.updatedProduct!.id ? { ...p, quantity: result.updatedProduct!.quantity } : p
        ));
        setDialogOpen(false);
        toast({
          title: "Stock Added",
          description: `${formData.get('quantity')} units of ${result.updatedProduct.name} have been added.`,
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Error updating stock',
            description: result.error || 'An unknown error occurred',
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
              {products.map((product) => {
                const Icon = productIcons[product.id] || Box;
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
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
