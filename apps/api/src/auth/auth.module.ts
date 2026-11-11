import { Module } from '@nestjs/common'

import { PrismaAuthStore } from '../prisma/prisma-auth.store.js'
import { PrismaModule } from '../prisma/prisma.module.js'
import { UsersModule } from '../users/users.module.js'
import { AuthController } from './auth.controller.js'
import { CredentialsService } from './credentials.service.js'
import { EmailVerificationMailer } from './mailers/email-verification.mailer.js'
import { PasswordResetMailer } from './mailers/password-reset.mailer.js'
import { SessionAuth } from './session-auth.provider.js'

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [AuthController],
  providers: [
    PrismaAuthStore,
    SessionAuth,
    CredentialsService,
    PasswordResetMailer,
    EmailVerificationMailer,
  ],
})
export class AuthModule {}
