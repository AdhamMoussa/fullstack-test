import type { INestApplication } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'

import { sessionCookieName } from '../config/session-cookie.js'
import { SESSION_COOKIE_SECURITY } from './api-responses.js'
import { registerOpenApiSchemaIds } from './openapi-schema-ids.js'

export function setupOpenApi(app: INestApplication): void {
  registerOpenApiSchemaIds()

  const configService = app.get(ConfigService)
  const cookieName = sessionCookieName(
    configService.getOrThrow<boolean>('SESSION_COOKIE_SECURE'),
  )

  const config = new DocumentBuilder()
    .setTitle('Auth Assessment API')
    .setDescription(
      `Cookie-session authentication through \`@nestjs/authentication\`. Sign in with \`/auth/signin\` or \`/auth/signup\`; the browser keeps the httpOnly \`${cookieName}\` cookie, so "Try it out" on \`/users/me\` works afterwards. Request bodies and responses come from the shared \`@repo/contract\` Zod schemas.`,
    )
    .setVersion('1.0')
    .addCookieAuth(
      cookieName,
      {
        type: 'apiKey',
        in: 'cookie',
        name: cookieName,
        description:
          'httpOnly session cookie set by signup, signin, and reset-password',
      },
      SESSION_COOKIE_SECURITY,
    )
    .build()

  SwaggerModule.setup(
    'docs',
    app,
    () =>
      SwaggerModule.createDocument(app, config, {
        operationIdFactory: (_controllerKey, methodKey) => methodKey,
      }),
    {
      jsonDocumentUrl: 'docs/json',
      customSiteTitle: 'Auth Assessment API docs',
    },
  )
}
