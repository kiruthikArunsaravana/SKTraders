import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const [clients, localSales, exports, products] = await Promise.all([
    prisma.client.findMany({ orderBy: { companyName: 'asc' } }),
    prisma.localSale.findMany({ select: { clientId: true, quantity: true, price: true, date: true } }),
    prisma.export.findMany({ select: { clientId: true, productId: true, quantity: true, date: true } }),
    prisma.product.findMany({ select: { id: true, sellingPrice: true, price: true } }),
  ]);

  const productPriceMap = new Map(products.map((p) => [p.id, p.sellingPrice ?? p.price ?? 0]));
  const totalsByClient = new Map<string, { totalSales: number; lastPurchaseDate: Date | null }>();

  for (const sale of localSales) {
    if (!sale.clientId) continue;
    const current = totalsByClient.get(sale.clientId) || { totalSales: 0, lastPurchaseDate: null };
    current.totalSales += sale.quantity * sale.price;
    if (!current.lastPurchaseDate || sale.date > current.lastPurchaseDate) current.lastPurchaseDate = sale.date;
    totalsByClient.set(sale.clientId, current);
  }

  for (const ex of exports) {
    const current = totalsByClient.get(ex.clientId) || { totalSales: 0, lastPurchaseDate: null };
    const price = productPriceMap.get(ex.productId) ?? 0;
    current.totalSales += ex.quantity * price;
    if (!current.lastPurchaseDate || ex.date > current.lastPurchaseDate) current.lastPurchaseDate = ex.date;
    totalsByClient.set(ex.clientId, current);
  }

  const hydrated = clients.map((client) => {
    const totals = totalsByClient.get(client.id);
    return {
      ...client,
      totalSales: totals?.totalSales ?? 0,
      lastPurchaseDate: totals?.lastPurchaseDate ?? client.lastPurchaseDate,
    };
  });

  return NextResponse.json(hydrated);
}

export async function POST(req: Request) {
  const body = await req.json();
  const created = await prisma.client.create({ data: body });
  return NextResponse.json(created);
}
