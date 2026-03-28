import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const purchases = await prisma.coconutPurchase.findMany({ orderBy: { date: 'desc' } });
  const normalized = purchases.map((p) => ({
    ...p,
    clientId: p.clientId ?? p.id,
    clientName: p.supplier ?? 'Unknown',
    paymentStatus: p.paymentStatus ?? 'Pending',
  }));
  return NextResponse.json(normalized);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clientId, quantity, price } = body;
    const paymentStatus = typeof body?.paymentStatus === 'string' ? body.paymentStatus : 'Pending';

    return prisma.$transaction(async (tx) => {
      const client = await tx.client.findUnique({ where: { id: clientId } });
      if (!client) throw new Error('Client not found');

      const qty = Math.trunc(Number(quantity));
      const unitPrice = Number(price);
      if (!Number.isFinite(qty) || qty <= 0 || !Number.isFinite(unitPrice) || unitPrice < 0) {
        throw new Error('Invalid purchase payload');
      }

      const purchase = await tx.coconutPurchase.create({ data: {
        clientId: client.id,
        supplier: client.companyName,
        quantity: qty,
        price: unitPrice,
        paymentStatus,
        date: new Date(),
      }});

      await tx.product.upsert({
        where: { id: 'coconut' },
        update: { quantity: { increment: qty } },
        create: { id: 'coconut', name: 'Coconut', quantity: qty, price: unitPrice, sku: 'COCONUT' }
      });

      if (paymentStatus === 'Paid') {
        await tx.financialTransaction.create({ data: {
          amount: -(qty * unitPrice),
          type: 'expense',
          description: `Paid for purchase of ${qty} coconuts from ${client.companyName}`,
          category: 'Coconut',
          clientName: client.companyName,
          quantity: qty,
          date: new Date(),
        }});
      }

      return NextResponse.json({
        ...purchase,
        clientId: client.id,
        clientName: client.companyName,
        paymentStatus: purchase.paymentStatus,
      });
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create coconut purchase' }, { status: 500 });
  }
}
