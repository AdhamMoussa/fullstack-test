import { EventEmitter } from 'node:events'

import type { LoggerService } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'
import { describe, expect, it, vi } from 'vitest'

import { createRequestLoggingMiddleware } from './request-logging.middleware.js'

const GENERATED_REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

class FakeResponse extends EventEmitter {
  statusCode = 200
  writableFinished = true
  private readonly headers = new Map<string, number | string>()

  setHeader(name: string, value: number | string): void {
    this.headers.set(name.toLowerCase(), value)
  }

  getHeader(name: string): number | string | undefined {
    return this.headers.get(name.toLowerCase())
  }
}

type FakeLogger = Pick<LoggerService, 'log' | 'warn' | 'error'>

function createFakeRequest(overrides: Partial<Request> = {}): Request {
  return {
    method: 'GET',
    originalUrl: '/',
    ip: '127.0.0.1',
    headers: {},
    ...overrides,
  } as unknown as Request
}

function createFakeLogger(): FakeLogger {
  return { log: vi.fn(), warn: vi.fn(), error: vi.fn() }
}

function startRequestLogging(
  request: Request,
  response: Response,
  logger: FakeLogger,
): NextFunction {
  const next = vi.fn()

  createRequestLoggingMiddleware(logger)(request, response, next)

  return next
}

describe('createRequestLoggingMiddleware', () => {
  it('generates a request id and echoes it on the response', () => {
    const response = new FakeResponse()
    const next = startRequestLogging(
      createFakeRequest(),
      response as unknown as Response,
      createFakeLogger(),
    )

    expect(response.getHeader('X-Request-Id')).toMatch(
      GENERATED_REQUEST_ID_PATTERN,
    )
    expect(next).toHaveBeenCalledOnce()
  })

  it('reuses a safe incoming request id', () => {
    const response = new FakeResponse()

    startRequestLogging(
      createFakeRequest({ headers: { 'x-request-id': 'checkout-42_abc.X' } }),
      response as unknown as Response,
      createFakeLogger(),
    )

    expect(response.getHeader('X-Request-Id')).toBe('checkout-42_abc.X')
  })

  it.each([
    ['spaces', 'not a request id'],
    ['a newline', 'request-id\ninjected'],
  ])('replaces an incoming request id containing %s', (_label, requestId) => {
    const response = new FakeResponse()

    startRequestLogging(
      createFakeRequest({ headers: { 'x-request-id': requestId } }),
      response as unknown as Response,
      createFakeLogger(),
    )

    expect(response.getHeader('X-Request-Id')).not.toBe(requestId)
    expect(response.getHeader('X-Request-Id')).toMatch(
      GENERATED_REQUEST_ID_PATTERN,
    )
  })

  it('strips the query string from the logged path', () => {
    const logger = createFakeLogger()
    const response = new FakeResponse()

    startRequestLogging(
      createFakeRequest({ originalUrl: '/app?token=secret&page=2' }),
      response as unknown as Response,
      logger,
    )
    response.emit('close')

    expect(logger.log).toHaveBeenCalledWith(
      'GET /app 200',
      expect.objectContaining({ path: '/app' }),
    )
    expect(JSON.stringify(vi.mocked(logger.log).mock.calls)).not.toContain(
      'token=secret',
    )
  })

  it.each([
    [200, 'log'],
    [401, 'warn'],
    [500, 'error'],
  ] as const)('logs a %i response at the %s level', (statusCode, level) => {
    const logger = createFakeLogger()
    const response = new FakeResponse()
    response.statusCode = statusCode

    startRequestLogging(
      createFakeRequest(),
      response as unknown as Response,
      logger,
    )
    response.emit('close')

    expect(logger[level]).toHaveBeenCalledOnce()
    expect(logger[level]).toHaveBeenCalledWith(
      `GET / ${statusCode}`,
      expect.objectContaining({ statusCode }),
    )
  })

  it('logs once on close and flags an unfinished response as aborted', () => {
    const logger = createFakeLogger()
    const response = new FakeResponse()
    response.writableFinished = false
    response.statusCode = 499

    startRequestLogging(
      createFakeRequest(),
      response as unknown as Response,
      logger,
    )
    response.emit('close')
    response.emit('close')

    expect(logger.warn).toHaveBeenCalledOnce()
    expect(logger.warn).toHaveBeenCalledWith(
      'GET / 499',
      expect.objectContaining({ aborted: true }),
    )
  })

  it('omits aborted when the response finished', () => {
    const logger = createFakeLogger()
    const response = new FakeResponse()

    startRequestLogging(
      createFakeRequest(),
      response as unknown as Response,
      logger,
    )
    response.emit('close')

    const fields = vi.mocked(logger.log).mock.calls[0]?.[1]

    expect(fields).not.toHaveProperty('aborted')
  })
})
