import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { products } from '@/lib/data';
import { Progress } from '@/components/ui/progress';

export default function StockPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline">Stock Management</h1>
        <Button>
          <PlusCircle className="mr-2 h-5 w-5" /> Add Stock
        </Button>
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
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <product.icon className="h-6 w-6 text-muted-foreground" />
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
