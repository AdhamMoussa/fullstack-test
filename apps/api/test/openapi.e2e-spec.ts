import type { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import type { App } from 'supertest/types.js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { AppModule } from '../src/app.module.js'
import { setupOpenApi } from '../src/openapi/setup-openapi.js'

interface JsonContent {
  schema?: { $ref?: string }
}

interface OperationDocument {
  requestBody?: { content?: Record<string, JsonContent> }
  responses?: Record<string, { content?: Record<string, JsonContent> }>
  security?: Array<Record<string, string[]>>
}

interface OpenApiDocument {
  paths: Record<string, Record<string, OperationDocument>>
  components?: {
    schemas?: Record<string, { properties?: Record<string, unknown> }>
    securitySchemes?: Record<
      string,
      { type?: string; in?: string; name?: string }
    >
  }
}

const contractSchemaIds = [
  'SignUpInput',
  'SignInInput',
  'ForgotPasswordInput',
  'ResetPasswordInput',
  'VerifyEmailInput',
  'User',
  'AuthResponse',
  'ApiError',
]

const jsonSchemaOf = (operation: OperationDocument, status?: string) => {
  const content = status
    ? operation.responses?.[status]?.content
    : operation.requestBody?.content

  return content?.['application/json']?.schema
}

describe('OpenAPI (e2e)', () => {
  let app: INestApplication<App>

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    setupOpenApi(app)
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('documents every route once', async () => {
    const response = await request(app.getHttpServer())
      .get('/docs/json')
      .expect(200)
    const document = response.body as OpenApiDocument

    expect(Object.keys(document.paths).sort()).toEqual(
      [
        '/auth/forgot-password',
        '/auth/reset-password',
        '/auth/signin',
        '/auth/sign-out',
        '/auth/signup',
        '/auth/verify-email',
        '/health',
        '/users/me',
        '/users/me/email-verification',
      ].sort(),
    )
    expect(document.paths).not.toHaveProperty('/')
    expect(document.paths).not.toHaveProperty('/auth/me')
  })

  it('names the contract schemas as components', async () => {
    const response = await request(app.getHttpServer())
      .get('/docs/json')
      .expect(200)
    const document = response.body as OpenApiDocument
    const componentNames = Object.keys(document.components?.schemas ?? {})

    expect(componentNames).toEqual(expect.arrayContaining(contractSchemaIds))
    expect(document.components?.schemas?.User.properties).not.toHaveProperty(
      'passwordHash',
    )
  })

  it('references the contract schemas from requests and responses', async () => {
    const response = await request(app.getHttpServer())
      .get('/docs/json')
      .expect(200)
    const document = response.body as OpenApiDocument
    const signupOperation = document.paths['/auth/signup'].post

    expect(jsonSchemaOf(signupOperation)).toEqual({
      $ref: '#/components/schemas/SignUpInput',
    })
    expect(jsonSchemaOf(signupOperation, '201')).toEqual({
      $ref: '#/components/schemas/AuthResponse',
    })
    expect(jsonSchemaOf(signupOperation, '409')).toEqual({
      $ref: '#/components/schemas/ApiError',
    })
    expect(jsonSchemaOf(document.paths['/users/me'].get, '200')).toEqual({
      $ref: '#/components/schemas/User',
    })
  })

  it('declares the session cookie security scheme', async () => {
    const response = await request(app.getHttpServer())
      .get('/docs/json')
      .expect(200)
    const document = response.body as OpenApiDocument

    expect(document.components?.securitySchemes?.session).toMatchObject({
      type: 'apiKey',
      in: 'cookie',
      name: '__Host-sid',
    })
    expect(document.paths['/users/me'].get.security).toEqual([{ session: [] }])
  })

  it('serves the Swagger UI', async () => {
    const response = await request(app.getHttpServer()).get('/docs').expect(200)

    expect(response.headers['content-type']).toContain('text/html')
  })
})
