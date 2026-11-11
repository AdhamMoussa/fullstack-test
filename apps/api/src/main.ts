import { ConsoleLogger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'

import { AppModule } from './app.module.js'
import { createRequestLoggingMiddleware } from './logging/request-logging.middleware.js'
import { setupOpenApi } from './openapi/setup-openapi.js'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger({ json: true, flattenParams: true }),
  })
  const config = app.get(ConfigService)
  const webOrigin = config.getOrThrow<string>('WEB_ORIGIN')

  // Registered before the security-header and CSRF hooks so request log lines
  // also cover requests those hooks reject.
  app.use(createRequestLoggingMiddleware())
  app.useSecurityHeaders()
  app.enableCors({ origin: webOrigin, credentials: true })
  app.enableCsrfProtection({ trustedOrigins: [webOrigin] })
  app.enableShutdownHooks()

  if (config.get<string>('NODE_ENV') !== 'production') {
    setupOpenApi(app)
  }

  await app.listen(config.get<number>('PORT') ?? 3000)
}

await bootstrap()
