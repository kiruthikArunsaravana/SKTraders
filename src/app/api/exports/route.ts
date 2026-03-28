import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const exportsList = await prisma.export.findMany({ orderBy: { date: 'desc' } });

  const [clients, products] = await Promise.all([
    prisma.client.findMany({ select: { id: true, companyName: true, country: true } }),
    prisma.product.findMany({ select: { id: true, price: true, sellingPrice: true } }),
  ]);

  const clientsMap = new Map(clients.map((c) => [c.id, c]));
  const productsMap = new Map(products.map((p) => [p.id, p]));

  const normalized = exportsList.map((ex) => {
    const client = clientsMap.get(ex.clientId);
    const product = productsMap.get(ex.productId);

    return {
      ...ex,
      clientName: client?.companyName ?? 'Unknown Client',
      destinationCountry: ex.destinationCountry ?? client?.country ?? 'N/A',
      destinationPort: ex.destinationPort ?? 'N/A',
      price: ex.price ?? product?.sellingPrice ?? product?.price ?? 0,
      status: ex.status ?? 'To-do',
      paymentStatus: ex.paymentStatus ?? 'Pending',
      invoiceNumber: ex.invoiceNumber ?? `INV-${ex.id.slice(0, 8).toUpperCase()}`,
    };
  });

  return NextResponse.json(normalized);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const paymentStatus = typeof body?.paymentStatus === 'string' ? body.paymentStatus : 'Pending';
    const clientId = String(body?.clientId || '');
    const productId = String(body?.productId || '');
    const destinationCountry = typeof body?.destinationCountry === 'string' ? body.destinationCountry : null;
    const destinationPort = typeof body?.destinationPort === 'string' ? body.destinationPort : null;
    const quantity = Number(body?.quantity);
    const price = Number(body?.price);
    const status = typeof body?.status === 'string' ? body.status : 'To-do';
    const invoiceNumber = typeof body?.invoiceNumber === 'string' ? body.invoiceNumber : null;

    if (!clientId || !productId || !Number.isFinite(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'Invalid export payload' }, { status: 400 });
    }
    if (paymentStatus !== 'Pending') {
      return NextResponse.json({ error: 'New export orders must start with Pending payment status.' }, { status: 400 });
    }

    const qty = Math.trunc(quantity);
    const unitPrice = Number.isFinite(price) && price >= 0 ? price : 0;
    const created = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) throw new Error('Product not found');
      if (product.quantity < qty) throw new Error(`Insufficient stock. Only ${product.quantity} units available.`);

      const ex = await tx.export.create({
        data: {
          clientId,
          productId,
          destinationCountry,
          destinationPort,
          quantity: qty,
          price: unitPrice,
          status,
          paymentStatus,
          invoiceNumber,
          date: new Date(),
        },
      });

      await tx.product.update({
        where: { id: productId },
        data: { quantity: product.quantity - qty, sellingPrice: unitPrice, modifiedDate: new Date() as any } as any,
      });

      return ex;
    });

    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create export' }, { status: 500 });
  }
}
