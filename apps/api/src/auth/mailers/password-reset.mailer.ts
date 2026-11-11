import { Injectable } from '@nestjs/common'
import {
  AuthenticationRegistry,
  PasswordResetHandler,
  type PasswordResetLink,
} from '@nestjs/authentication'
import { html, Mailer } from '@nestjs/mail'

import { UsersRepository } from '../../users/users.repository.js'

@Injectable()
export class PasswordResetMailer extends PasswordResetHandler {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly mailer: Mailer,
    registry: AuthenticationRegistry,
  ) {
    super()
    registry.registerHandler('passwordReset', this)
  }

  async findUser(email: string) {
    const storedCredentials =
      await this.usersRepository.findCredentials(email)

    return storedCredentials
      ? {
          id: storedCredentials.user.id,
          email: storedCredentials.user.email,
          passwordHash: storedCredentials.passwordHash,
        }
      : null
  }

  async send({ email, url }: PasswordResetLink): Promise<void> {
    await this.mailer.send({
      to: email,
      subject: 'Reset your password',
      text: `Someone asked to reset your password.\n\nChoose a new one here: ${url}\n\nThe link works once. If it wasn't you, ignore this email.`,
      html: html`
        <p>Someone asked to reset your password.</p>
        <p><a href="${url}">Choose a new password</a></p>
        <p>The link works once. If it wasn't you, ignore this email.</p>
      `,
    })
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.usersRepository.updatePasswordHash(userId, passwordHash)
  }
}
