import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const entries = await prisma.coconutWorkerEntry.findMany({ orderBy: [{ weekStart: 'desc' }, { createdAt: 'desc' }] })
  return NextResponse.json(entries)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const weekStart = new Date(body?.weekStart)
    const processedCoconuts = Number(body?.processedCoconuts)
    const totalWorkerCost = Number(body?.totalWorkerCost)
    const paidToWorker = Number(body?.paidToWorker)

    if (
      Number.isNaN(weekStart.getTime()) ||
      !Number.isFinite(processedCoconuts) || processedCoconuts < 0 ||
      !Number.isFinite(totalWorkerCost) || totalWorkerCost < 0 ||
      !Number.isFinite(paidToWorker) || paidToWorker < 0
    ) {
      return NextResponse.json({ error: 'Invalid coconut worker entry payload' }, { status: 400 })
    }

    const created = await prisma.$transaction(async (tx) => {
      const entry = await tx.coconutWorkerEntry.create({
        data: {
          weekStart,
          processedCoconuts: Math.trunc(processedCoconuts),
          totalWorkerCost,
          paidToWorker,
        },
      })

      if (paidToWorker > 0) {
        await tx.financialTransaction.create({
          data: {
            amount: -paidToWorker,
            type: 'expense',
            description: `Worker payment for coconut processing week of ${weekStart.toISOString().slice(0, 10)}`,
            category: 'Labour',
            clientName: 'Coconut Worker',
            quantity: Math.trunc(processedCoconuts),
            date: new Date(),
          },
        })
      }

      return entry
    })

    return NextResponse.json(created)
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to create coconut worker entry' }, { status: 500 })
  }
}
