import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const sales = await prisma.localSale.findMany({ orderBy: { date: 'desc' } });
  const [clients, products] = await Promise.all([
    prisma.client.findMany({ select: { id: true, companyName: true } }),
    prisma.product.findMany({ select: { id: true } }),
  ]);

  const clientsMap = new Map(clients.map((c) => [c.id, c]));
  const productsSet = new Set(products.map((p) => p.id));

  const normalized = sales.map((sale) => ({
    ...sale,
    clientName: sale.clientId ? (clientsMap.get(sale.clientId)?.companyName ?? 'Walk-in') : 'Walk-in',
    status: sale.status ?? 'To-do',
    paymentStatus: sale.paymentStatus ?? 'Pending',
    invoiceNumber: sale.invoiceNumber ?? `INV-${sale.id.slice(0, 8).toUpperCase()}`,
    productId: productsSet.has(sale.productId) ? sale.productId : 'coco-pith',
  }));

  return NextResponse.json(normalized);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const paymentStatus = typeof body?.paymentStatus === 'string' ? body.paymentStatus : 'Pending';
    const productId = String(body?.productId || '');
    const quantity = Number(body?.quantity);
    const price = Number(body?.price);
    const clientId = typeof body?.clientId === 'string' && body.clientId ? body.clientId : null;
    const status = typeof body?.status === 'string' ? body.status : 'To-do';
    const invoiceNumber = typeof body?.invoiceNumber === 'string' ? body.invoiceNumber : null;

    if (!productId || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: 'Invalid local sale payload' }, { status: 400 });
    }
    if (paymentStatus !== 'Pending') {
      return NextResponse.json({ error: 'New local sales must start with Pending payment status.' }, { status: 400 });
    }

    const qty = Math.trunc(quantity);
    const created = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error('Product not found');
      if (product.quantity < qty) throw new Error(`Insufficient stock. Only ${product.quantity} units available.`);

      await tx.product.update({
        where: { id: productId },
        data: { quantity: product.quantity - qty, modifiedDate: new Date() as any } as any,
      });

      // Producing/selling copra consumes coconut stock too.
      if (productId === 'copra') {
        const coconut = await tx.product.findUnique({ where: { id: 'coconut' } });
        if (!coconut || coconut.quantity < qty) throw new Error('Insufficient coconut stock to produce copra.');
        await tx.product.update({
          where: { id: 'coconut' },
          data: { quantity: coconut.quantity - qty, modifiedDate: new Date() as any } as any,
        });
      }

      return tx.localSale.create({
        data: {
          clientId,
          productId,
          quantity: qty,
          price,
          status,
          paymentStatus,
          invoiceNumber,
          date: new Date(),
        },
      });
    });
    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create local sale' }, { status: 500 });
  }
}
