import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const { password } = await req.json();
  if (password !== 'SK-Traders') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  return prisma.$transaction(async (tx) => {
    await tx.coconutWorkerEntry.deleteMany();
    await tx.financialTransaction.deleteMany();
    await tx.export.deleteMany();
    await tx.localSale.deleteMany();
    await tx.coconutPurchase.deleteMany();
    await tx.client.deleteMany();

    // Reset product quantities to zero
    await tx.product.updateMany({ data: { quantity: 0 } as any });

    return NextResponse.json({ ok: true });
  });
}
