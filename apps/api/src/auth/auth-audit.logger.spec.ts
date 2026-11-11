import { Logger } from '@nestjs/common'
import {
  AuthenticationEvents,
  type AuthenticationEvent,
} from '@nestjs/authentication'
import { Subject } from 'rxjs'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AuthAuditLogger } from './auth-audit.logger.js'

let auditLogger: AuthAuditLogger | undefined
let authenticationEventStream: Subject<AuthenticationEvent> | undefined

function startAuditLogger(): AuthAuditLogger {
  authenticationEventStream = new Subject<AuthenticationEvent>()
  auditLogger = new AuthAuditLogger({
    events$: authenticationEventStream.asObservable(),
  } as unknown as AuthenticationEvents)
  auditLogger.onModuleInit()

  return auditLogger
}

function emitAuthenticationEvent(event: AuthenticationEvent): void {
  authenticationEventStream?.next(event)
}

afterEach(() => {
  auditLogger?.onModuleDestroy()
  auditLogger = undefined
  authenticationEventStream = undefined
  vi.restoreAllMocks()
})

describe('AuthAuditLogger', () => {
  it('logs a sign-in with the user id and method, but no session id', () => {
    const logSpy = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => {})
    startAuditLogger()

    emitAuthenticationEvent({
      type: 'sign-in',
      userId: 'user-1',
      method: 'password',
      sessionId: 'session-1',
      tokenFamilyId: 'family-1',
      metadata: { ip: '127.0.0.1' },
    })

    expect(logSpy).toHaveBeenCalledWith('auth.sign-in', {
      userId: 'user-1',
      method: 'password',
    })
    expect(JSON.stringify(logSpy.mock.calls)).not.toContain('session-1')
    expect(JSON.stringify(logSpy.mock.calls)).not.toContain('127.0.0.1')
  })

  it('logs a reset request with the account lookup result, never the email', () => {
    const logSpy = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => {})
    startAuditLogger()

    emitAuthenticationEvent({
      type: 'password-reset-requested',
      email: 'known@example.com',
      userId: 'user-1',
    })
    emitAuthenticationEvent({
      type: 'password-reset-requested',
      email: 'unknown@example.com',
    })

    expect(logSpy).toHaveBeenNthCalledWith(1, 'auth.password-reset-requested', {
      accountFound: true,
      userId: 'user-1',
    })
    expect(logSpy).toHaveBeenNthCalledWith(2, 'auth.password-reset-requested', {
      accountFound: false,
    })
    expect(JSON.stringify(logSpy.mock.calls)).not.toContain('@example.com')
  })

  it('stops logging after the module is destroyed', () => {
    const logSpy = vi
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => {})
    const startedAuditLogger = startAuditLogger()

    emitAuthenticationEvent({ type: 'password-reset', userId: 'user-1' })
    startedAuditLogger.onModuleDestroy()
    emitAuthenticationEvent({ type: 'password-reset', userId: 'user-2' })

    expect(logSpy).toHaveBeenCalledOnce()
    expect(logSpy).toHaveBeenCalledWith('auth.password-reset', {
      userId: 'user-1',
    })
  })
})
