import { PrismaClient } from '../generated/prisma/index.js'

export * from '../generated/prisma/index.js'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

// Call after env loading: PrismaClient reads MONGODB_URI at construction.
export function getPrismaClient(): PrismaClient {
  globalForPrisma.prisma ??= new PrismaClient()
  return globalForPrisma.prisma
}
