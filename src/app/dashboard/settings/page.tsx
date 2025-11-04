'use client';

import { useState } from 'react';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFirestore } from '@/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { Loader2, Trash2 } from 'lucide-react';
import { initialProducts } from '@/lib/data';

export default function SettingsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [isResetting, setIsResetting] = useState(false);
  const [password, setPassword] = useState('');
  const [isPasswordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const collectionsToClear = ['clients', 'exports', 'local_sales', 'financial_transactions'];

  const handlePasswordSubmit = () => {
    if (password === 'SK-Traders') {
      setPasswordDialogOpen(false);
      setConfirmDialogOpen(true);
      setPassword(''); // Clear password after submission
    } else {
      toast({
        variant: 'destructive',
        title: 'Incorrect Password',
        description: 'The password you entered is incorrect. Please try again.',
      });
    }
  };

  const handleResetData = async () => {
    if (!firestore) {
      toast({
        variant: 'destructive',
        title: 'Firestore not available',
        description: 'Please try again later.',
      });
      return;
    }

    setIsResetting(true);
    setConfirmDialogOpen(false);

    try {
      const batch = writeBatch(firestore);

      // Clear specified collections
      for (const collectionName of collectionsToClear) {
        const collectionRef = collection(firestore, collectionName);
        const snapshot = await getDocs(collectionRef);
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
        });
      }
      
      // Reset product quantities
      for (const product of initialProducts) {
        const productRef = doc(firestore, 'products', product.id);
        batch.update(productRef, { quantity: 0 });
      }

      await batch.commit();

      toast({
        title: 'Application Data Reset',
        description: 'All test data has been cleared successfully.',
      });
    } catch (error) {
      console.error('Error resetting data:', error);
      toast({
        variant: 'destructive',
        title: 'Error Resetting Data',
        description:
          (error as Error).message ||
          'An unexpected error occurred. Please check the console.',
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-headline">Settings</h1>
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle>Danger Zone</CardTitle>
          <CardDescription>
            These actions are destructive and cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-start gap-4 rounded-lg border border-destructive/50 p-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="font-semibold">Reset Application Data</h3>
              <p className="text-sm text-muted-foreground">
                This will permanently delete all clients, sales, exports, and financial records. Product stock will be reset to zero.
              </p>
            </div>
            
            <Dialog open={isPasswordDialogOpen} onOpenChange={setPasswordDialogOpen}>
              <DialogTrigger asChild>
                 <Button variant="destructive" disabled={isResetting}>
                  {isResetting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Reset Data
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Authentication Required</DialogTitle>
                  <DialogDescription>
                    To proceed, please enter the administrator password. The
                    password is SK-Traders.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handlePasswordSubmit}>Proceed</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <AlertDialog open={isConfirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete all transactional data from the database.
                    
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleResetData} className={buttonVariants({ variant: "destructive" })}>
                    Yes, reset data
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}
