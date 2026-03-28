import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await req.json();

    const updateData: {
      clientId?: string | null;
      productId?: string;
      quantity?: number;
      price?: number;
      status?: string;
      paymentStatus?: string;
      invoiceNumber?: string | null;
      date?: Date;
    } = {};

    if (typeof body?.clientId === 'string') updateData.clientId = body.clientId || null;
    if (typeof body?.productId === 'string' && body.productId) updateData.productId = body.productId;
    if (Number.isFinite(Number(body?.quantity))) updateData.quantity = Math.trunc(Number(body.quantity));
    if (Number.isFinite(Number(body?.price))) updateData.price = Number(body.price);
    if (typeof body?.status === 'string' && body.status) updateData.status = body.status;
    if (typeof body?.paymentStatus === 'string' && body.paymentStatus) updateData.paymentStatus = body.paymentStatus;
    if (body?.invoiceNumber !== undefined) updateData.invoiceNumber = typeof body.invoiceNumber === 'string' ? body.invoiceNumber : null;
    if (body?.date) updateData.date = new Date(body.date);

    return prisma.$transaction(async (tx) => {
      const current = await tx.localSale.findUnique({ where: { id } });
      if (!current) {
        return NextResponse.json({ error: 'Local sale not found' }, { status: 404 });
      }
      if (current.paymentStatus === 'Paid' && updateData.paymentStatus && updateData.paymentStatus !== 'Paid') {
        return NextResponse.json({ error: 'Paid status cannot be changed back to Pending.' }, { status: 400 });
      }

      const updated = Object.keys(updateData).length === 0
        ? current
        : await tx.localSale.update({ where: { id }, data: updateData });

      if (updated.paymentStatus === 'Paid' && current.paymentStatus !== 'Paid') {
        const [client, product] = await Promise.all([
          updated.clientId ? tx.client.findUnique({ where: { id: updated.clientId }, select: { companyName: true } }) : Promise.resolve(null),
          tx.product.findUnique({ where: { id: updated.productId }, select: { name: true } }),
        ]);
        const amount = Math.abs(updated.quantity * updated.price);

        await tx.financialTransaction.create({
          data: {
            amount,
            type: 'income',
            description: `Local sale of ${updated.quantity} ${product?.name ?? updated.productId} to ${client?.companyName ?? 'Walk-in client'}`,
            category: product?.name ?? updated.productId,
            clientName: client?.companyName ?? 'Walk-in',
            quantity: updated.quantity,
            date: new Date(),
          },
        });
      }

      return NextResponse.json(updated);
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update local sale' }, { status: 500 });
  }
}
