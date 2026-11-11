import { Module, StandardSchemaValidationPipe } from '@nestjs/common'
import { APP_PIPE } from '@nestjs/core'
import { AuthenticationModule, type Duration } from '@nestjs/authentication'
import { ConfigModule, ConfigService } from '@nestjs/config'

import { AuthModule } from './auth/auth.module.js'
import { UsersModule } from './users/users.module.js'
import { MailModule } from './mail/mail.module.js'

import { AppController } from './app.controller.js'
import { AppService } from './app.service.js'

import { validateEnv } from './config/env.validation.js'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    MailModule,
    AuthenticationModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const webOrigin = config.getOrThrow<string>('WEB_ORIGIN')
        const appUrl = config.getOrThrow<string>('APP_URL')

        return {
          session: {
            absoluteTtl: config.getOrThrow<string>(
              'SESSION_ABSOLUTE_TTL',
            ) as Duration,
            idleTtl: config.getOrThrow<string>('SESSION_IDLE_TTL') as Duration,
            trustedOrigins: [webOrigin],
            metadata: ({ headers, ip }) => ({
              ...(typeof headers['user-agent'] === 'string' && {
                userAgent: headers['user-agent'],
              }),
              ...(ip !== undefined && { ip }),
            }),
          },
          passwordReset: { url: `${appUrl}/reset-password` },
          // Password reset marks the account's address verified through this
          // handler. The app exposes no separate verification flow.
          emailVerification: { url: `${appUrl}/verify-email` },
        }
      },
    }),
    UsersModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: StandardSchemaValidationPipe,
    },
  ],
})
export class AppModule {}
