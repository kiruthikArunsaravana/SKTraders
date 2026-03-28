import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await req.json();

    const updateData: {
      clientId?: string;
      productId?: string;
      destinationCountry?: string | null;
      destinationPort?: string | null;
      quantity?: number;
      price?: number;
      status?: string;
      paymentStatus?: string;
      invoiceNumber?: string | null;
      date?: Date;
    } = {};
    const nextPrice = Number(body?.price);

    if (typeof body?.clientId === 'string' && body.clientId) updateData.clientId = body.clientId;
    if (typeof body?.productId === 'string' && body.productId) updateData.productId = body.productId;
    if (body?.destinationCountry !== undefined) updateData.destinationCountry = typeof body.destinationCountry === 'string' ? body.destinationCountry : null;
    if (body?.destinationPort !== undefined) updateData.destinationPort = typeof body.destinationPort === 'string' ? body.destinationPort : null;
    if (Number.isFinite(Number(body?.quantity))) updateData.quantity = Math.trunc(Number(body.quantity));
    if (Number.isFinite(nextPrice)) updateData.price = nextPrice;
    if (typeof body?.status === 'string' && body.status) updateData.status = body.status;
    if (typeof body?.paymentStatus === 'string' && body.paymentStatus) updateData.paymentStatus = body.paymentStatus;
    if (body?.invoiceNumber !== undefined) updateData.invoiceNumber = typeof body.invoiceNumber === 'string' ? body.invoiceNumber : null;
    if (body?.date) updateData.date = new Date(body.date);

    return prisma.$transaction(async (tx) => {
      const current = await tx.export.findUnique({ where: { id } });
      if (!current) {
        return NextResponse.json({ error: 'Export not found' }, { status: 404 });
      }
      if (current.paymentStatus === 'Paid' && updateData.paymentStatus && updateData.paymentStatus !== 'Paid') {
        return NextResponse.json({ error: 'Paid status cannot be changed back to Pending.' }, { status: 400 });
      }

      const updated = Object.keys(updateData).length === 0
        ? current
        : await tx.export.update({ where: { id }, data: updateData });

      if (Number.isFinite(nextPrice) && nextPrice >= 0 && updated?.productId) {
        await tx.product.upsert({
          where: { id: updated.productId },
          update: { sellingPrice: nextPrice, modifiedDate: new Date() as any } as any,
          create: {
            id: updated.productId,
            name: updated.productId,
            price: nextPrice,
            sellingPrice: nextPrice,
            quantity: 0,
            modifiedDate: new Date() as any,
          } as any,
        });
      }

      if (updated.paymentStatus === 'Paid' && current.paymentStatus !== 'Paid') {
        const [client, product] = await Promise.all([
          tx.client.findUnique({ where: { id: updated.clientId }, select: { companyName: true } }),
          tx.product.findUnique({ where: { id: updated.productId }, select: { name: true, sellingPrice: true, price: true } }),
        ]);
        const unitPrice = Number.isFinite(nextPrice) && nextPrice >= 0
          ? nextPrice
          : Number(updated.price ?? product?.sellingPrice ?? product?.price ?? 0);
        const amount = Math.abs(updated.quantity * unitPrice);

        await tx.financialTransaction.create({
          data: {
            amount,
            type: 'income',
            description: `Export order of ${updated.quantity} ${product?.name ?? updated.productId} for ${client?.companyName ?? 'Unknown Client'}`,
            category: product?.name ?? updated.productId,
            clientName: client?.companyName ?? 'Unknown Client',
            quantity: updated.quantity,
            date: new Date(),
          },
        });
      }

      return NextResponse.json(updated);
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update export' }, { status: 500 });
  }
}
