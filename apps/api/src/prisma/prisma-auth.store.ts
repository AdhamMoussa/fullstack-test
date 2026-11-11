import { Injectable } from '@nestjs/common'
import {
  AuthenticationStorage,
  type EmailTokenPurpose,
  type EmailTokenRecord,
  type EmailTokenStore,
  type SessionRecord,
  type SessionStore,
} from '@nestjs/authentication'
import { Prisma, type AuthEmailToken, type AuthSession } from '@repo/db'

import { PrismaService } from './prisma.service.js'

@Injectable()
export class PrismaAuthStore implements SessionStore, EmailTokenStore {
  protected readonly maxPendingEmailTokens: number = 100

  constructor(
    private readonly prismaService: PrismaService,
    storage: AuthenticationStorage,
  ) {
    storage.registerSource({ sessions: this, emailTokens: this })
  }

  async getSession(id: string): Promise<SessionRecord | undefined> {
    const sessionRow = await this.prismaService.client.authSession.findUnique({
      where: { id },
    })

    return sessionRow ? this.toSession(sessionRow) : undefined
  }

  async createSession(newSession: SessionRecord): Promise<void> {
    // Prune only absolute expiry; idle sessions are handled by SessionService.
    await this.prismaService.client.authSession.deleteMany({
      where: { expiresAt: { lte: newSession.createdAt } },
    })
    await this.prismaService.client.authSession.create({
      data: {
        id: newSession.id,
        userId: newSession.userId,
        createdAt: newSession.createdAt,
        expiresAt: newSession.expiresAt,
        lastActiveAt: newSession.lastActiveAt,
        mfa: newSession.mfa,
        metadata: newSession.metadata as Prisma.InputJsonValue | undefined,
      },
    })
  }

  async touchSession(id: string, lastActiveAt: Date): Promise<void> {
    await this.prismaService.client.authSession.updateMany({
      where: { id, lastActiveAt: { lt: lastActiveAt } },
      data: { lastActiveAt },
    })
  }

  async deleteSession(id: string): Promise<boolean> {
    const { count: deletedSessionCount } =
      await this.prismaService.client.authSession.deleteMany({ where: { id } })

    return deletedSessionCount > 0
  }

  async listUserSessions(userId: string): Promise<SessionRecord[]> {
    const sessionRows = await this.prismaService.client.authSession.findMany({
      where: { userId },
    })

    return sessionRows.map((sessionRow) => this.toSession(sessionRow))
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await this.prismaService.client.authSession.deleteMany({
      where: { userId },
    })
  }

  async saveEmailToken(emailToken: EmailTokenRecord): Promise<void> {
    await this.prismaService.client.authEmailToken.create({
      data: {
        id: emailToken.id,
        purpose: emailToken.purpose,
        userId: emailToken.userId,
        email: emailToken.email,
        fingerprint: emailToken.fingerprint,
        createdAt: emailToken.createdAt,
        expiresAt: emailToken.expiresAt,
      },
    })
    await this.prismaService.client.authEmailToken.deleteMany({
      where: { expiresAt: { lte: emailToken.createdAt } },
    })
    await this.pruneEmailTokens()
  }

  async consumeEmailToken(
    id: string,
    purpose: EmailTokenPurpose,
  ): Promise<EmailTokenRecord | undefined> {
    try {
      // One conditional find-and-delete: it returns the token and only one of
      // several concurrent consumes can match the id/purpose pair.
      const emailTokenRow =
        await this.prismaService.client.authEmailToken.delete({
          where: { id, purpose },
        })

      return this.toEmailToken(emailTokenRow)
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        return undefined
      }
      throw error
    }
  }

  async deleteUserEmailTokens(
    userId: string,
    purpose: EmailTokenPurpose,
  ): Promise<void> {
    await this.prismaService.client.authEmailToken.deleteMany({
      where: { userId, purpose },
    })
  }

  private toSession(sessionRow: AuthSession): SessionRecord {
    return {
      id: sessionRow.id,
      userId: sessionRow.userId,
      createdAt: sessionRow.createdAt,
      expiresAt: sessionRow.expiresAt,
      lastActiveAt: sessionRow.lastActiveAt,
      ...(sessionRow.mfa === null
        ? {}
        : { mfa: sessionRow.mfa as SessionRecord['mfa'] }),
      ...(sessionRow.metadata === null
        ? {}
        : { metadata: sessionRow.metadata as Record<string, unknown> }),
    }
  }

  private toEmailToken(emailTokenRow: AuthEmailToken): EmailTokenRecord {
    return {
      id: emailTokenRow.id,
      purpose: emailTokenRow.purpose as EmailTokenPurpose,
      userId: emailTokenRow.userId,
      email: emailTokenRow.email,
      ...(emailTokenRow.fingerprint === null
        ? {}
        : { fingerprint: emailTokenRow.fingerprint }),
      createdAt: emailTokenRow.createdAt,
      expiresAt: emailTokenRow.expiresAt,
    }
  }

  private async pruneEmailTokens(): Promise<void> {
    const storedTokenCount =
      await this.prismaService.client.authEmailToken.count()
    const tokensOverLimit = storedTokenCount - this.maxPendingEmailTokens

    if (tokensOverLimit <= 0) return

    const oldestTokens =
      await this.prismaService.client.authEmailToken.findMany({
        orderBy: { expiresAt: 'asc' },
        take: tokensOverLimit,
        select: { id: true },
      })

    if (oldestTokens.length === 0) return

    await this.prismaService.client.authEmailToken.deleteMany({
      where: { id: { in: oldestTokens.map(({ id }) => id) } },
    })
  }
}
