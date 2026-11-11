import { Injectable } from '@nestjs/common'
import type { User } from '@repo/contract'

import { PrismaService } from '../prisma/prisma.service.js'
import { toUser } from './user.mapper.js'

export const normalizeEmail = (email: string): string =>
  email.trim().normalize('NFC').toLowerCase()

@Injectable()
export class UsersRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async create(newUser: {
    email: string
    name: string
    passwordHash: string
  }): Promise<User> {
    const user = await this.prismaService.client.user.create({
      data: {
        email: normalizeEmail(newUser.email),
        name: newUser.name,
        passwordHash: newUser.passwordHash,
      },
    })

    return toUser(user)
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prismaService.client.user.findUnique({
      where: { id },
    })
    return user ? toUser(user) : null
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prismaService.client.user.findUnique({
      where: { email: normalizeEmail(email) },
    })
    return user ? toUser(user) : null
  }

  async findCredentials(
    email: string,
  ): Promise<{ user: User; passwordHash: string } | null> {
    const user = await this.prismaService.client.user.findUnique({
      where: { email: normalizeEmail(email) },
    })

    return user ? { user: toUser(user), passwordHash: user.passwordHash } : null
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
