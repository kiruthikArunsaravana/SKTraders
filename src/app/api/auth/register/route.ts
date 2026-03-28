import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, signToken } from '@/lib/auth'

export async function POST(req: Request) {
  const body = await req.json();
  const { email, password } = body;
  if (!email || !password) {
    return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: 'User already exists' }, { status: 409 });
  }

  // Determine role
  let role = 'Employee';
  if (email.toLowerCase().includes('manager')) role = 'Manager';
  if (email.toLowerCase().includes('admin')) role = 'Admin';

  const hashed = await hashPassword(password);
  const user = await prisma.user.create({ data: { email, password: hashed, role } });

  const token = signToken({ id: user.id, email: user.email, role: user.role });
  const res = NextResponse.json({ id: user.id, email: user.email, role: user.role });
  res.headers.set('Set-Cookie', `token=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}`);
  return res;
}
