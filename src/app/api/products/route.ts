import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request) {
  const products = await prisma.product.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json(products);
}

export async function POST(req: Request) {
  const body = await req.json();
  const created = await prisma.product.create({ data: body });
  return NextResponse.json(created);
}

export async function PATCH(req: Request) {
  const { id, ...rest } = await req.json();
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const updated = await prisma.product.update({ where: { id }, data: rest });
  return NextResponse.json(updated);
}
