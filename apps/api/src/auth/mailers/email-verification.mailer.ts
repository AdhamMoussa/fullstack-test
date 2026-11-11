import { Injectable } from '@nestjs/common'
import {
  AuthenticationRegistry,
  EmailVerificationHandler,
  type EmailVerificationLink,
} from '@nestjs/authentication'
import { html, Mailer } from '@nestjs/mail'

import { UsersRepository } from '../../users/users.repository.js'

/**
 * Delivers the email-verification links: signup and the resend endpoint send
 * them through `EmailVerificationService`. The package's password-reset
 * service also marks an address verified through `markVerified()`.
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
      text: `Confirm your email address: ${url}\n\nThe link expires in 24 hours and works once.`,
      html: html`
        <p>Confirm your email address.</p>
        <p><a href="${url}">Verify my email</a></p>
        <p>The link expires in 24 hours and works once.</p>
      `,
    })
  }

  markVerified(userId: string, email: string): Promise<boolean> {
    return this.usersRepository.markEmailVerified(userId, email)
  }
}
