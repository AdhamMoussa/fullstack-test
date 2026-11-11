import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config = app.get(ConfigService)
  const webOrigin = config.getOrThrow<string>('WEB_ORIGIN')

  app.useSecurityHeaders()
  app.enableCors({ origin: webOrigin, credentials: true })
  app.enableCsrfProtection({ trustedOrigins: [webOrigin] })
  app.enableShutdownHooks()

  await app.listen(config.get<number>('PORT') ?? 3000)
}

await bootstrap()
