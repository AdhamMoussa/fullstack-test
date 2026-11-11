import { randomUUID } from 'node:crypto'

import { AuthenticationStorage } from '@nestjs/authentication'
import { authenticationStoreContract } from '@nestjs/authentication/testing'
import { getPrismaClient, PrismaClient } from '@repo/db'
import { afterAll, describe, expect, it } from 'vitest'

import { PrismaAuthStore } from '../src/prisma/prisma-auth.store.js'
import { PrismaService } from '../src/prisma/prisma.service.js'

const prisma = getPrismaClient()
const maxPending = 3

class CappedPrismaAuthStore extends PrismaAuthStore {
  protected override readonly maxPendingEmailTokens = maxPending
}

const contractCases = authenticationStoreContract(
  async () => {
    await prisma.authSession.deleteMany({})
    await prisma.authEmailToken.deleteMany({})
    const authStore = new CappedPrismaAuthStore(
      new PrismaService(prisma),
      new AuthenticationStorage(),
    )
    return { sessions: authStore, emailTokens: authStore }
  },
  { contracts: ['sessions', 'emailTokens'], concurrent: true, maxPending },
)

describe('PrismaAuthStore', () => {
  it('registers both contracts with AuthenticationStorage', () => {
    const authenticationStorage = new AuthenticationStorage()
    const authStore = new CappedPrismaAuthStore(
      new PrismaService(prisma),
      authenticationStorage,
    )

    expect(authenticationStorage.sessions).toBe(authStore)
    expect(authenticationStorage.emailTokens).toBe(authStore)
  })

  for (const contractCase of contractCases) {
    it(contractCase.name, () => contractCase.run())
  }

  it('keeps sessions and email tokens in MongoDB across store instances', async () => {
    const userId = `user-${randomUUID()}`
    const createdAt = new Date()
    const sessionRecord = {
      id: randomUUID().replaceAll('-', ''),
      userId,
      createdAt,
      expiresAt: new Date(createdAt.getTime() + 60_000),
      lastActiveAt: createdAt,
    }
    const emailTokenRecord = {
      id: randomUUID().replaceAll('-', ''),
      purpose: 'password-reset' as const,
      userId,
      email: 'persisted@example.com',
      fingerprint: 'password-hash-fingerprint',
      createdAt,
      expiresAt: new Date(createdAt.getTime() + 60_000),
    }

    const firstPrismaClient = new PrismaClient()
    try {
      const firstStore = new CappedPrismaAuthStore(
        new PrismaService(firstPrismaClient),
        new AuthenticationStorage(),
      )
      await firstStore.createSession(sessionRecord)
      await firstStore.saveEmailToken(emailTokenRecord)
    } finally {
      await firstPrismaClient.$disconnect()
    }

    const secondPrismaClient = new PrismaClient()
    try {
      const secondStore = new CappedPrismaAuthStore(
        new PrismaService(secondPrismaClient),
        new AuthenticationStorage(),
      )
      expect(await secondStore.getSession(sessionRecord.id)).toEqual(
        sessionRecord,
      )
      expect(await secondStore.listUserSessions(userId)).toEqual([
        sessionRecord,
      ])
      expect(
        await secondStore.consumeEmailToken(
          emailTokenRecord.id,
          emailTokenRecord.purpose,
        ),
      ).toEqual(emailTokenRecord)
      expect(
        await secondStore.consumeEmailToken(
          emailTokenRecord.id,
          emailTokenRecord.purpose,
        ),
      ).toBeUndefined()
    } finally {
      await secondPrismaClient.authSession.deleteMany({ where: { userId } })
      await secondPrismaClient.authEmailToken.deleteMany({ where: { userId } })
      await secondPrismaClient.$disconnect()
    }
  })
})

afterAll(async () => {
  await prisma.authSession.deleteMany({})
  await prisma.authEmailToken.deleteMany({})
  await prisma.$disconnect()
})
