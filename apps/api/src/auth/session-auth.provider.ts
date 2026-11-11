import { Injectable } from '@nestjs/common'
import {
  AuthenticationRegistry,
  SessionCookieProvider,
  type SessionRecord,
} from '@nestjs/authentication'
import type { PublicUser } from '@repo/contract'

import { UsersRepository } from '../users/users.repository.js'

@Injectable()
export class SessionAuth extends SessionCookieProvider<PublicUser> {
  constructor(
    private readonly usersRepository: UsersRepository,
    registry: AuthenticationRegistry,
  ) {
    super()
    registry.registerProvider(this)
  }

  protected validate(session: SessionRecord): Promise<PublicUser | null> {
    return this.usersRepository.findById(session.userId)
  }
}
