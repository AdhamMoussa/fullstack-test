import type { User as ContractUser } from '@repo/contract'
import type { User as PrismaUser } from '@repo/db'

export function toUser(user: PrismaUser): ContractUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}
