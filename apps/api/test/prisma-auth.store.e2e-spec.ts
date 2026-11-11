import { randomUUID } from 'node:crypto'

import { AuthenticationStorage } from '@nestjs/authentication'
import { authenticationStoreContract } from '@nestjs/authentication/testing'
import { getPrismaClient, PrismaClient } from '@repo/db'
import { afterAll, describe, expect, it } from 'vitest'

import { PrismaAuthStore } from '../src/prisma/prisma-auth.store.js'

const prisma = getPrismaClient()
const maxPending = 3

class CappedPrismaAuthStore extends PrismaAuthStore {
  protected override readonly maxPendingEmailTokens = maxPending
}

const cases = authenticationStoreContract(
  async () => {
    await prisma.authSession.deleteMany({})
    await prisma.authEmailToken.deleteMany({})
    const store = new CappedPrismaAuthStore(prisma, new AuthenticationStorage())
    return { sessions: store, emailTokens: store }
  },
  { contracts: ['sessions', 'emailTokens'], concurrent: true, maxPending },
)

describe('PrismaAuthStore', () => {
  it('registers both contracts with AuthenticationStorage', () => {
    const storage = new AuthenticationStorage()
    const store = new CappedPrismaAuthStore(prisma, storage)

    expect(storage.sessions).toBe(store)
    expect(storage.emailTokens).toBe(store)
  })

  for (const testCase of cases) {
    it(testCase.name, () => testCase.run())
  }

  it('keeps sessions and email tokens in MongoDB across store instances', async () => {
    const userId = `user-${randomUUID()}`
    const now = new Date()
    const session = {
      id: randomUUID().replaceAll('-', ''),
      userId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + 60_000),
      lastActiveAt: now,
    }
    const token = {
      id: randomUUID().replaceAll('-', ''),
      purpose: 'password-reset' as const,
      userId,
      email: 'persisted@example.com',
      fingerprint: 'password-hash-fingerprint',
      createdAt: now,
      expiresAt: new Date(now.getTime() + 60_000),
    }

    const firstClient = new PrismaClient()
    try {
      const firstStore = new CappedPrismaAuthStore(
        firstClient,
        new AuthenticationStorage(),
      )
      await firstStore.createSession(session)
      await firstStore.saveEmailToken(token)
    } finally {
      await firstClient.$disconnect()
    }

    const secondClient = new PrismaClient()
    try {
      const secondStore = new CappedPrismaAuthStore(
        secondClient,
        new AuthenticationStorage(),
      )
      expect(await secondStore.getSession(session.id)).toEqual(session)
      expect(await secondStore.listUserSessions(userId)).toEqual([session])
      expect(
        await secondStore.consumeEmailToken(token.id, token.purpose),
      ).toEqual(token)
      expect(
        await secondStore.consumeEmailToken(token.id, token.purpose),
      ).toBeUndefined()
    } finally {
      await secondClient.authSession.deleteMany({ where: { userId } })
      await secondClient.authEmailToken.deleteMany({ where: { userId } })
      await secondClient.$disconnect()
    }
  })
})

afterAll(async () => {
  await prisma.authSession.deleteMany({})
  await prisma.authEmailToken.deleteMany({})
  await prisma.$disconnect()
})
