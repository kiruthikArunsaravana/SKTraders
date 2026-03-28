import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const body = await req.json();

    const updateData: { clientId?: string | null; supplier?: string; quantity?: number; price?: number; paymentStatus?: string; date?: Date } = {};
    if (typeof body?.clientId === 'string') updateData.clientId = body.clientId || null;
    if (typeof body?.supplier === 'string') updateData.supplier = body.supplier;
    if (Number.isFinite(Number(body?.quantity))) updateData.quantity = Math.trunc(Number(body.quantity));
    if (Number.isFinite(Number(body?.price))) updateData.price = Number(body.price);
    if (typeof body?.paymentStatus === 'string' && body.paymentStatus) updateData.paymentStatus = body.paymentStatus;
    if (body?.date) updateData.date = new Date(body.date);

    return prisma.$transaction(async (tx) => {
      const current = await tx.coconutPurchase.findUnique({ where: { id } });
      if (!current) {
        return NextResponse.json({ error: 'Coconut purchase not found' }, { status: 404 });
      }
      if (current.paymentStatus === 'Paid' && updateData.paymentStatus && updateData.paymentStatus !== 'Paid') {
        return NextResponse.json({ error: 'Paid status cannot be changed back to Pending.' }, { status: 400 });
      }

      const updated = Object.keys(updateData).length > 0
        ? await tx.coconutPurchase.update({ where: { id }, data: updateData })
        : current;

      if (updated.paymentStatus === 'Paid' && current.paymentStatus !== 'Paid') {
        const total = updated.quantity * updated.price;
        await tx.financialTransaction.create({ data: {
          amount: -total,
          type: 'expense',
          description: `Paid for purchase of ${updated.quantity} coconuts from ${updated.supplier}`,
          category: 'Coconut',
          clientName: updated.supplier ?? undefined,
          quantity: updated.quantity,
          date: new Date(),
        }});
      }

      return NextResponse.json({
        ...updated,
        clientId: updated.clientId ?? updated.id,
        clientName: updated.supplier ?? 'Unknown',
        paymentStatus: updated.paymentStatus ?? 'Pending',
      });
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to update coconut purchase' }, { status: 500 });
  }
}
