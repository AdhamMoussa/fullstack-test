import { Injectable } from '@nestjs/common'
import {
  AuthenticationStorage,
  type EmailTokenPurpose,
  type EmailTokenRecord,
  type EmailTokenStore,
  type SessionRecord,
  type SessionStore,
} from '@nestjs/authentication'
import {
  Prisma,
  type AuthEmailToken,
  type AuthSession,
  type PrismaClient,
} from '@repo/db'

@Injectable()
export class PrismaAuthStore implements SessionStore, EmailTokenStore {
  protected readonly maxPendingEmailTokens: number = 100

  constructor(
    private readonly prisma: PrismaClient,
    storage: AuthenticationStorage,
  ) {
    storage.registerSource({ sessions: this, emailTokens: this })
  }

  async getSession(id: string): Promise<SessionRecord | undefined> {
    const row = await this.prisma.authSession.findUnique({ where: { id } })
    return row ? this.toSession(row) : undefined
  }

  async createSession(record: SessionRecord): Promise<void> {
    // Prune only absolute expiry; idle sessions are handled by SessionService.
    await this.prisma.authSession.deleteMany({
      where: { expiresAt: { lte: record.createdAt } },
    })
    await this.prisma.authSession.create({
      data: {
        id: record.id,
        userId: record.userId,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
        lastActiveAt: record.lastActiveAt,
        mfa: record.mfa,
        metadata: record.metadata as Prisma.InputJsonValue | undefined,
      },
    })
  }

  async touchSession(id: string, lastActiveAt: Date): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { id, lastActiveAt: { lt: lastActiveAt } },
      data: { lastActiveAt },
    })
  }

  async deleteSession(id: string): Promise<boolean> {
    const { count } = await this.prisma.authSession.deleteMany({ where: { id } })
    return count > 0
  }

  async listUserSessions(userId: string): Promise<SessionRecord[]> {
    const rows = await this.prisma.authSession.findMany({ where: { userId } })
    return rows.map((row) => this.toSession(row))
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await this.prisma.authSession.deleteMany({ where: { userId } })
  }

  async saveEmailToken(record: EmailTokenRecord): Promise<void> {
    await this.prisma.authEmailToken.create({
      data: {
        id: record.id,
        purpose: record.purpose,
        userId: record.userId,
        email: record.email,
        fingerprint: record.fingerprint,
        createdAt: record.createdAt,
        expiresAt: record.expiresAt,
      },
    })
    await this.prisma.authEmailToken.deleteMany({
      where: { expiresAt: { lte: record.createdAt } },
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
      const row = await this.prisma.authEmailToken.delete({
        where: { id, purpose },
      })
      return this.toEmailToken(row)
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
    await this.prisma.authEmailToken.deleteMany({ where: { userId, purpose } })
  }

  private toSession(row: AuthSession): SessionRecord {
    return {
      id: row.id,
      userId: row.userId,
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
      lastActiveAt: row.lastActiveAt,
      ...(row.mfa === null ? {} : { mfa: row.mfa as SessionRecord['mfa'] }),
      ...(row.metadata === null
        ? {}
        : { metadata: row.metadata as Record<string, unknown> }),
    }
  }

  private toEmailToken(row: AuthEmailToken): EmailTokenRecord {
    return {
      id: row.id,
      purpose: row.purpose as EmailTokenPurpose,
      userId: row.userId,
      email: row.email,
      ...(row.fingerprint === null ? {} : { fingerprint: row.fingerprint }),
      createdAt: row.createdAt,
      expiresAt: row.expiresAt,
    }
  }

  private async pruneEmailTokens(): Promise<void> {
    const count = await this.prisma.authEmailToken.count()
    const excess = count - this.maxPendingEmailTokens
    if (excess <= 0) return

    const oldest = await this.prisma.authEmailToken.findMany({
      orderBy: { expiresAt: 'asc' },
      take: excess,
      select: { id: true },
    })
    if (oldest.length === 0) return

    await this.prisma.authEmailToken.deleteMany({
      where: { id: { in: oldest.map(({ id }) => id) } },
    })
  }
}
