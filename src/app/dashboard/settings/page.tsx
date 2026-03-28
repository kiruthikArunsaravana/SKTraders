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
import { Loader2, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState(false);
  const [password, setPassword] = useState('');
  const [isPasswordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'SK-Traders') {
      setPasswordDialogOpen(false);
      setConfirmDialogOpen(true);
    } else {
      toast({
        variant: 'destructive',
        title: 'Incorrect Password',
        description: 'The password you entered is incorrect. Please try again.',
      });
    }
  };

  const handleResetData = async () => {
    setIsResetting(true);
    setConfirmDialogOpen(false);

    try {
      const res = await fetch('/api/settings/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      if (!res.ok) throw new Error('Reset failed');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('coconut-worker:changed'));
      }

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
      setPassword('');
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
                The Pass word is "SK-Traders"
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
                <form onSubmit={handlePasswordSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <DialogFooter className="mt-4">
                    <Button variant="outline" type="button" onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
                    <Button type="submit">Proceed</Button>
                  </DialogFooter>
                </form>
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
