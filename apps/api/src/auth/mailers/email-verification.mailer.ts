import { Injectable } from '@nestjs/common'
import {
  AuthenticationRegistry,
  EmailVerificationHandler,
  type EmailVerificationLink,
} from '@nestjs/authentication'
import { html, Mailer } from '@nestjs/mail'

import { UsersRepository } from '../../users/users.repository.js'

/**
 * The package's password-reset service marks an address verified through the
 * email-verification handler. The app exposes no verification flow, but this
 * keeps that reset behaviour working.
 */
@Injectable()
export class EmailVerificationMailer extends EmailVerificationHandler {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly mailer: Mailer,
    registry: AuthenticationRegistry,
  ) {
    super()
    registry.registerHandler('emailVerification', this)
  }

  async send({ email, url }: EmailVerificationLink): Promise<void> {
    await this.mailer.send({
      to: email,
      subject: 'Verify your email address',
      text: `Confirm your email address: ${url}`,
      html: html`
        <p>Confirm your email address.</p>
        <p><a href="${url}">Verify my email</a></p>
      `,
    })
  }

  markVerified(userId: string, email: string): Promise<boolean> {
    return this.usersRepository.markEmailVerified(userId, email)
  }
}
