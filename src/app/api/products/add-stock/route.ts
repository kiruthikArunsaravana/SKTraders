import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const { productId, quantity } = await req.json();
  if (!productId || !quantity) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.product.findUnique({ where: { id: productId } });
    if (!existing) {
      // Create product entry if missing (fallback)
      const created = await tx.product.create({ data: { id: productId, name: productId, quantity, price: 0 } });
      return created;
    }
    const updated = await tx.product.update({ where: { id: productId }, data: { quantity: existing.quantity + quantity, modifiedDate: new Date() as any } as any });
    return updated;
  });

  return NextResponse.json(result);
}
