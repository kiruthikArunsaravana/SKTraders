'use client';

import { PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const expenseCategories = [
  { id: 'husk', name: 'Husk' },
  { id: 'maintenance', name: 'Maintenance' },
  { id: 'labour', name: 'Labour' },
  { id: 'other', name: 'Other' },
];

const incomeProducts = [
  { id: 'coco-pith', name: 'Coco Pith' },
  { id: 'coir-fiber', name: 'Coir Fiber' },
  { id: 'husk-chips', name: 'Husk Chips' },
  { id: 'other', name: 'Other' },
];

export default function FinancePage() {
  const { toast } = useToast();
  const [isDialogOpen, setDialogOpen] = useState(false);
  const [entryType, setEntryType] = useState('income');

  function handleFeatureClick(featureName: string) {
    toast({
      title: "Feature coming soon",
      description: `The "${featureName}" feature is not yet implemented.`,
    });
  }

  function handleAddEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const type = formData.get('type');
    const amount = formData.get('amount');
    const description = formData.get('description');
    
    setDialogOpen(false);
    toast({
      title: "Entry Added",
      description: `A new ${type} entry for $${amount} has been recorded.`,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-headline">Finance Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleFeatureClick('Export PDF')}>Export PDF</Button>
          <Dialog open={isDialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-5 w-5" /> Add Entry
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Financial Entry</DialogTitle>
                <DialogDescription>
                  Record a new income or expense transaction.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddEntry}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <RadioGroup 
                      defaultValue="income" 
                      name="type" 
                      className="flex gap-4"
                      onValueChange={(value) => setEntryType(value)}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="income" id="income" />
                        <Label htmlFor="income">Income</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="expense" id="expense" />
                        <Label htmlFor="expense">Expense</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input id="amount" name="amount" type="number" placeholder="0.00" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" name="description" placeholder="e.g., Sale of Coco Pith" required />
                  </div>
                  {entryType === 'expense' && (
                    <div className="space-y-2">
                      <Label htmlFor="category">Category</Label>
                      <Select name="category">
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {expenseCategories.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {entryType === 'income' && (
                    <div className="space-y-2">
                      <Label htmlFor="product">Product</Label>
                      <Select name="product">
                        <SelectTrigger>
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                        <SelectContent>
                          {incomeProducts.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="submit">Add Entry</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="profit-loss">Profit/Loss</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
            <Card>
                <CardHeader>
                    <CardTitle>Financial Overview</CardTitle>
                    <CardDescription>A summary of your income, expenses, and profit.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p>Financial overview content goes here.</p>
                </CardContent>
            </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
