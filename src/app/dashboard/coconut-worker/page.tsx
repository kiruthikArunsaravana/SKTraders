'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, startOfWeek, parseISO, parse } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

type CoconutWorkerEntryRecord = {
  id: string;
  weekStart: string;
  processedCoconuts: number;
  totalWorkerCost: number;
  paidToWorker: number;
  createdAt: string;
};

function getCurrentWeekStartDate() {
  return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

function parseWeekStartDate(value: string): Date | null {
  const iso = parseISO(value);
  if (!Number.isNaN(iso.getTime())) return iso;
  const dmy = parse(value, 'dd-MM-yyyy', new Date());
  if (!Number.isNaN(dmy.getTime())) return dmy;
  return null;
}

export default function CoconutWorkerPage() {
  const { toast } = useToast();
  const [entries, setEntries] = useState<CoconutWorkerEntryRecord[]>([]);
  const [coconutStock, setCoconutStock] = useState<number | null>(null);
  const [weekStart, setWeekStart] = useState<string>(getCurrentWeekStartDate());
  const [processedCoconuts, setProcessedCoconuts] = useState<string>('');
  const [totalWorkerCost, setTotalWorkerCost] = useState<string>('');
  const [paidToWorker, setPaidToWorker] = useState<string>('');
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);

  useEffect(() => {
    const loadEntries = async () => {
      try {
        const res = await fetch('/api/coconut-worker');
        if (!res.ok) throw new Error('Failed to fetch coconut worker entries');
        const parsed = await res.json();
        setEntries(Array.isArray(parsed) ? parsed : []);
      } catch {
        setEntries([]);
      } finally {
        setIsLoadingEntries(false);
      }
    };

    void loadEntries();
    window.addEventListener('coconut-worker:changed', loadEntries as EventListener);

    return () => {
      window.removeEventListener('coconut-worker:changed', loadEntries as EventListener);
    };
  }, []);

  useEffect(() => {
    const loadCoconutStock = async () => {
      try {
        const res = await fetch('/api/products');
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data)) return;
        const coconut = data.find((p: any) => p?.id === 'coconut');
        setCoconutStock(Number(coconut?.quantity) || 0);
      } catch {
        // Keep null if stock fetch fails.
      }
    };

    loadCoconutStock();
  }, []);

  const overallSummary = useMemo(() => {
    const totalProcessed = entries.reduce((acc, e) => acc + e.processedCoconuts, 0);
    const totalPaid = entries.reduce((acc, e) => acc + e.paidToWorker, 0);
    const totalBalance = entries.reduce((acc, e) => acc + (e.totalWorkerCost - e.paidToWorker), 0);

    return {
      totalProcessed,
      totalPaid,
      totalBalance,
    };
  }, [entries]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime());
  }, [entries]);

  const handleAddEntry = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const processed = Number(processedCoconuts);
    const totalCost = Number(totalWorkerCost);
    const paid = Number(paidToWorker);

    if (!weekStart || !Number.isFinite(processed) || processed < 0 || !Number.isFinite(totalCost) || totalCost < 0 || !Number.isFinite(paid) || paid < 0) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please enter valid values for all fields.',
      });
      return;
    }

    if (coconutStock === null) {
      toast({
        variant: 'destructive',
        title: 'Stock Check Failed',
        description: 'Unable to verify available coconut stock. Please refresh and try again.',
      });
      return;
    }

    const alreadyProcessed = overallSummary.totalProcessed;
    const currentlyAvailable = Math.max(0, coconutStock - alreadyProcessed);
    if (processed > currentlyAvailable) {
      toast({
        variant: 'destructive',
        title: 'Insufficient Coconut Stock',
        description: `Available: ${currentlyAvailable.toLocaleString()}, Processed entered: ${processed.toLocaleString()}.`,
      });
      return;
    }

    try {
      const res = await fetch('/api/coconut-worker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weekStart,
          processedCoconuts: processed,
          totalWorkerCost: totalCost,
          paidToWorker: paid,
        }),
      });
      if (!res.ok) throw new Error('Failed to save coconut worker entry');

      setProcessedCoconuts('');
      setTotalWorkerCost('');
      setPaidToWorker('');
      window.dispatchEvent(new CustomEvent('coconut-worker:changed'));
      window.dispatchEvent(new CustomEvent('firestore-shim:changed', { detail: { collectionName: 'financial_transactions' } }));

      toast({
        title: 'Entry Added',
        description: 'Coconut worker details saved successfully.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: (error as Error).message || 'Could not save the worker entry.',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-headline">Coconut Worker</h1>
        <p className="text-muted-foreground">Track weekly coconut processing, worker payment, and balance.</p>
        <p className="text-xs text-muted-foreground mt-1">
          Coconut available for processing: {coconutStock === null ? 'Loading...' : Math.max(0, coconutStock - overallSummary.totalProcessed).toLocaleString()}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Processed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{overallSummary.totalProcessed.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">All saved worker entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Cost Given</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${overallSummary.totalPaid.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">All saved worker entries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Worker Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${overallSummary.totalBalance.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Remaining amount across all entries</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Worker Entry</CardTitle>
          <CardDescription>Enter weekly coconut processing and worker payment details.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-4" onSubmit={handleAddEntry}>
            <div className="space-y-2">
              <Label htmlFor="weekStart">Week Start</Label>
              <Input id="weekStart" type="date" value={weekStart} onChange={(e) => setWeekStart(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="processedCoconuts">Coconut Processed</Label>
              <Input
                id="processedCoconuts"
                type="number"
                min="0"
                step="1"
                value={processedCoconuts}
                onChange={(e) => setProcessedCoconuts(e.target.value)}
                placeholder="e.g. 5000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalWorkerCost">Total Worker Cost</Label>
              <Input
                id="totalWorkerCost"
                type="number"
                min="0"
                step="0.01"
                value={totalWorkerCost}
                onChange={(e) => setTotalWorkerCost(e.target.value)}
                placeholder="e.g. 1200"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paidToWorker">Amount Given</Label>
              <Input
                id="paidToWorker"
                type="number"
                min="0"
                step="0.01"
                value={paidToWorker}
                onChange={(e) => setPaidToWorker(e.target.value)}
                placeholder="e.g. 700"
                required
              />
            </div>
            <div className="md:col-span-4">
              <Button type="submit">Save Entry</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Worker Entries</CardTitle>
          <CardDescription>Weekly history of processed coconuts and worker payments.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Week Start</TableHead>
                <TableHead>Processed</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Amount Given</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!isLoadingEntries && sortedEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">No worker entries yet.</TableCell>
                </TableRow>
              ) : (
                sortedEntries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{format(parseWeekStartDate(entry.weekStart) ?? new Date(), 'PPP')}</TableCell>
                    <TableCell>{entry.processedCoconuts.toLocaleString()}</TableCell>
                    <TableCell>${entry.totalWorkerCost.toLocaleString()}</TableCell>
                    <TableCell>${entry.paidToWorker.toLocaleString()}</TableCell>
                    <TableCell className="text-right">${(entry.totalWorkerCost - entry.paidToWorker).toLocaleString()}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
