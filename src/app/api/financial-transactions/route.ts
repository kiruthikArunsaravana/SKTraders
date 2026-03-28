import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const txns = await prisma.financialTransaction.findMany({ orderBy: { date: 'desc' } });
  return NextResponse.json(txns);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const amount = Number(body?.amount);
    const type = body?.type === 'expense' ? 'expense' : 'income';
    const description = typeof body?.description === 'string' ? body.description : null;
    const category = typeof body?.category === 'string' ? body.category : null;
    const clientName = typeof body?.clientName === 'string' ? body.clientName : null;
    const quantity = body?.quantity !== undefined && body?.quantity !== null ? Math.trunc(Number(body.quantity)) : null;

    let date = new Date();
    if (body?.date) {
      if (typeof body.date === 'string' || body.date instanceof Date) {
        date = new Date(body.date);
      } else if (typeof body.date?.toDate === 'function') {
        date = body.date.toDate();
      } else if (body.date?.seconds) {
        date = new Date(Number(body.date.seconds) * 1000);
      }
    }

    if (!Number.isFinite(amount) || !description || !category || Number.isNaN(date.getTime())) {
      return NextResponse.json({ error: 'Invalid financial transaction payload' }, { status: 400 });
    }

    const created = await prisma.financialTransaction.create({
      data: {
        amount,
        type,
        description,
        category,
        clientName,
        quantity: Number.isFinite(quantity) ? quantity : null,
        date,
      },
    });

    return NextResponse.json(created);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create financial transaction' }, { status: 500 });
  }
}
