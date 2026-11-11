import { Injectable } from '@nestjs/common'
import type { PublicUser } from '@repo/contract'

import { PrismaService } from '../prisma/prisma.service.js'
import { toPublicUser } from './user.mapper.js'

export const normalizeEmail = (email: string): string =>
  email.trim().normalize('NFC').toLowerCase()

@Injectable()
export class UsersRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async create(newUser: {
    email: string
    name: string
    passwordHash: string
  }): Promise<PublicUser> {
    const user = await this.prismaService.client.user.create({
      data: {
        email: normalizeEmail(newUser.email),
        name: newUser.name,
        passwordHash: newUser.passwordHash,
      },
    })

    return toPublicUser(user)
  }

  async findById(id: string): Promise<PublicUser | null> {
    const user = await this.prismaService.client.user.findUnique({
      where: { id },
    })
    return user ? toPublicUser(user) : null
  }

  async findByEmail(email: string): Promise<PublicUser | null> {
    const user = await this.prismaService.client.user.findUnique({
      where: { email: normalizeEmail(email) },
    })
    return user ? toPublicUser(user) : null
  }

  async findCredentials(
    email: string,
  ): Promise<{ user: PublicUser; passwordHash: string } | null> {
    const user = await this.prismaService.client.user.findUnique({
      where: { email: normalizeEmail(email) },
    })

    return user
      ? { user: toPublicUser(user), passwordHash: user.passwordHash }
      : null
  }

  async updatePasswordHash(id: string, passwordHash: string): Promise<void> {
    await this.prismaService.client.user.update({
      where: { id },
      data: { passwordHash },
    })
  }

  async markEmailVerified(id: string, email: string): Promise<boolean> {
    const { count: matchedUserCount } =
      await this.prismaService.client.user.updateMany({
        where: { id, email: normalizeEmail(email) },
        data: { emailVerified: true },
      })

    return matchedUserCount > 0
  }
}
