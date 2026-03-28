import { PrismaClient } from '@prisma/client'

declare global {
  // allow global `var` in development so the client is not re-created on HMR
  // eslint-disable-next-line vars-on-top
  var prisma: PrismaClient | undefined
}

export const prisma = global.prisma ?? new PrismaClient()
if (process.env.NODE_ENV !== 'production') global.prisma = prisma
