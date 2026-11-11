import { randomUUID } from 'node:crypto'

import { Logger, type LoggerService } from '@nestjs/common'
import type { NextFunction, Request, Response } from 'express'

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/
const NANOSECONDS_PER_MILLISECOND = 1_000_000

function resolveRequestId(
  incomingRequestId: string | string[] | undefined,
): string {
  const isSafeIncomingRequestId =
    typeof incomingRequestId === 'string' &&
    REQUEST_ID_PATTERN.test(incomingRequestId)

  return isSafeIncomingRequestId ? incomingRequestId : randomUUID()
}

function withoutQueryString(originalUrl: string): string {
  const queryStart = originalUrl.indexOf('?')

  return queryStart === -1 ? originalUrl : originalUrl.slice(0, queryStart)
}

/**
 * Logs one JSON-friendly line per request, after the response closes. Reuses a
 * safe incoming `X-Request-Id` (or generates one) and echoes it back so a
 * client can correlate its request with the log line.
 */
export function createRequestLoggingMiddleware(
  logger: Pick<LoggerService, 'log' | 'warn' | 'error'> = new Logger('HTTP'),
) {
  return function requestLoggingMiddleware(
    request: Request,
    response: Response,
    next: NextFunction,
  ): void {
    const startedAt = process.hrtime.bigint()
    const requestId = resolveRequestId(request.headers['x-request-id'])
    const method = request.method
    const path = withoutQueryString(request.originalUrl)

    response.setHeader('X-Request-Id', requestId)

    // "close" fires after "finish", and also when the client aborts.
    response.once('close', () => {
      const statusCode = response.statusCode
      const elapsedNanoseconds = process.hrtime.bigint() - startedAt
      const durationMs =
        Number(elapsedNanoseconds) / NANOSECONDS_PER_MILLISECOND
      const contentLength = response.getHeader('content-length')
      const logFields = {
        requestId,
        method,
        path,
        statusCode,
        durationMs: Math.round(durationMs * 10) / 10,
        ip: request.ip,
        ...(typeof request.headers['user-agent'] === 'string' && {
          userAgent: request.headers['user-agent'],
        }),
        ...((typeof contentLength === 'string' ||
          typeof contentLength === 'number') && {
          contentLength: Number(contentLength),
        }),
        ...(!response.writableFinished && { aborted: true }),
      }
      const logMessage = `${method} ${path} ${statusCode}`

      if (statusCode >= 500) {
        logger.error(logMessage, logFields)
      } else if (statusCode >= 400) {
        logger.warn(logMessage, logFields)
      } else {
        logger.log(logMessage, logFields)
      }
    })

    next()
  }
}
