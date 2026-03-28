import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  try {
    const { saleId } = await req.json();
    if (!saleId) return NextResponse.json({ error: 'Missing saleId' }, { status: 400 });

    return prisma.$transaction(async (tx) => {
      const sale = await tx.localSale.findUnique({ where: { id: saleId } });
      if (!sale) throw new Error('Sale not found');

      const product = await tx.product.findUnique({ where: { id: sale.productId } });
      if (!product) throw new Error('Product not found');

      if (product.quantity < sale.quantity) throw new Error(`Cannot complete sale, insufficient stock. Only ${product.quantity} units available.`);

      await tx.product.update({ where: { id: product.id }, data: { quantity: product.quantity - sale.quantity, modifiedDate: new Date() as any } as any });

      // If producing copra reduces coconut stock
      if (sale.productId === 'copra') {
        const coconut = await tx.product.findUnique({ where: { id: 'coconut' } });
        if (!coconut || coconut.quantity < sale.quantity) throw new Error('Insufficient coconut stock to produce copra.');
        await tx.product.update({ where: { id: 'coconut' }, data: { quantity: coconut.quantity - sale.quantity, modifiedDate: new Date() as any } as any });
      }

      const updated = await tx.localSale.findUnique({ where: { id: saleId } });
      return NextResponse.json({ updated });
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to complete local sale' }, { status: 500 });
  }
}
