'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Boxes, Ship } from 'lucide-react';
import { useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query } from 'firebase/firestore';
import type { Client, Export, Product } from '@/lib/types';
import { initialProducts } from '@/lib/data';


export default function DashboardCards() {
  const firestore = useFirestore();
  
  const clientsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'clients'));
  }, [firestore]);

  const { data: clients } = useCollection<Client>(clientsQuery);
  
  const exportsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'exports'));
  }, [firestore]);
  
  const { data: exports } = useCollection<Export>(exportsQuery);

  const productsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'products'));
  }, [firestore]);

  const { data: products } = useCollection<Omit<Product, 'id' | 'icon'>>(productsQuery);

  const totalClients = clients?.length ?? 0;
  const totalExportValue = exports?.reduce((sum, e) => sum + e.quantity, 0) ?? 0;
  
  const productsWithIcons = useMemo(() => {
    const productMap = new Map<string, Product>(initialProducts.map(p => [p.id, p]));
    if (products) {
      products.forEach(dbProduct => {
        const existingProduct = productMap.get(dbProduct.id);
        if (existingProduct) {
          productMap.set(dbProduct.id, { ...existingProduct, ...dbProduct });
        }
      });
    }
    return Array.from(productMap.values());
  }, [products]);

  const totalStock = productsWithIcons.reduce((sum, p) => sum + p.quantity, 0);

  const cards = [
    {
      title: 'Total Clients',
      value: totalClients,
      change: 'All registered clients',
      icon: Users,
    },
    {
      title: 'Total Stock',
      value: `${totalStock.toLocaleString()} units`,
      change: 'Across all products',
      icon: Boxes,
    },
    {
      title: 'Total Export Value',
      value: `$${totalExportValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: 'All time',
      icon: Ship,
    },
  ];

  return (
    <>
      {cards.map((kpi) => (
        <Card key={kpi.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
            <kpi.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <p className="text-xs text-muted-foreground">{kpi.change}</p>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
