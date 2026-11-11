import { ConflictException, Injectable } from '@nestjs/common'
import { PasswordHasher } from '@nestjs/authentication'
import type { PublicUser } from '@repo/contract'
import { Prisma } from '@repo/db'

import { UsersRepository } from '../users/users.repository.js'

const isUniqueConstraintError = (
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002'

@Injectable()
export class CredentialsService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async register(registration: {
    email: string
    name: string
    password: string
  }): Promise<PublicUser> {
    if (await this.usersRepository.findByEmail(registration.email)) {
      throw new ConflictException('Email already registered.')
    }

    const passwordHash = await this.passwordHasher.hash(registration.password)

    try {
      return await this.usersRepository.create({
        email: registration.email,
        name: registration.name,
        passwordHash,
      })
    } catch (error) {
      // Two signups can pass the lookup above at the same time; the unique
      // index is the source of truth.
      if (isUniqueConstraintError(error)) {
        throw new ConflictException('Email already registered.')
      }
      throw error
    }
  }

  async verifyPassword(
    email: string,
    password: string,
  ): Promise<PublicUser | null> {
    const storedCredentials = await this.usersRepository.findCredentials(email)
    // With no account the hasher checks a dummy hash, so the response time
    // does not reveal which addresses are registered.
    const passwordMatches = await this.passwordHasher.verify(
      password,
      storedCredentials?.passwordHash,
    )

    if (!passwordMatches || !storedCredentials) {
      return null
    }

    if (this.passwordHasher.needsRehash(storedCredentials.passwordHash)) {
      const upgradedPasswordHash = await this.passwordHasher.hash(password)

      await this.usersRepository.updatePasswordHash(
        storedCredentials.user.id,
        upgradedPasswordHash,
      )
    }

    return storedCredentials.user
  }
}
