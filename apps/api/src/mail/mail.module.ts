import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import {
  LogMailTransport,
  MailModule as NestMailModule,
  SmtpTransport,
} from '@nestjs/mail'

@Module({
  imports: [
    NestMailModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const smtpUrl = config.get<string>('SMTP_URL')

        return {
          transport: smtpUrl
            ? new SmtpTransport({ url: smtpUrl })
            : new LogMailTransport(),
          from: config.getOrThrow<string>('MAIL_FROM'),
        }
      },
    }),
  ],
})
export class MailModule {}
