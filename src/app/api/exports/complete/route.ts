import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { exportId } = await req.json();
    if (!exportId) return NextResponse.json({ error: 'Missing exportId' }, { status: 400 });

    return prisma.$transaction(async (tx) => {
      const ex = await tx.export.findUnique({ where: { id: exportId } });
      if (!ex) throw new Error('Export not found');

      const product = await tx.product.findUnique({ where: { id: ex.productId } });
      if (!product) throw new Error('Product not found');

      if (product.quantity < ex.quantity) {
        throw new Error(`Cannot complete order, insufficient stock. Only ${product.quantity} units available.`);
      }

      await tx.product.update({
        where: { id: product.id },
        data: { quantity: product.quantity - ex.quantity, modifiedDate: new Date() as any } as any
      });
      const updated = await tx.export.findUnique({ where: { id: exportId } });

      return NextResponse.json({ updated });
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to complete export' }, { status: 500 });
  }
}
