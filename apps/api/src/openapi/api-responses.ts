import { applyDecorators } from '@nestjs/common'
import { ApiResponse } from '@nestjs/swagger'
import { apiErrorSchema } from '@repo/contract'

export const SESSION_COOKIE_SECURITY = 'session'

export const VALIDATION_ERROR_DESCRIPTION =
  'Body failed the shared contract schema; `message` lists `field: problem` strings.'

export const sessionCookieHeader = {
  'Set-Cookie': {
    description:
      'Session cookie: __Host-sid=…; HttpOnly; Secure; SameSite=Lax; Path=/',
    schema: { type: 'string' },
  },
}

export function ApiErrorResponse(status: number, description: string) {
  return applyDecorators(
    ApiResponse({ status, description, standardSchema: apiErrorSchema }),
  )
}

export function ApiUntrustedOriginResponse() {
  return ApiErrorResponse(
    403,
    'Request came from an origin other than WEB_ORIGIN (CSRF origin check).',
  )
}
