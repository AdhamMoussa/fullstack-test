import { Injectable, Logger } from '@nestjs/common'
import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import {
  AuthenticationEvents,
  type AuthenticationEvent,
} from '@nestjs/authentication'
import type { Subscription } from 'rxjs'

/**
 * Writes the authentication package's audit events to the structured log.
 * Only an allowlist of safe fields is logged: never emails, session ids,
 * token family ids, or metadata.
 */
@Injectable()
export class AuthAuditLogger implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('AuthAudit')
  private authenticationEventsSubscription?: Subscription

  constructor(private readonly authenticationEvents: AuthenticationEvents) {}

  onModuleInit(): void {
    this.authenticationEventsSubscription =
      this.authenticationEvents.events$.subscribe((event) => {
        this.logEvent(event)
      })
  }

  onModuleDestroy(): void {
    this.authenticationEventsSubscription?.unsubscribe()
  }

  private logEvent(event: AuthenticationEvent): void {
    const message = `auth.${event.type}`

    switch (event.type) {
      case 'sign-in':
        this.logger.log(message, {
          userId: event.userId,
          method: event.method,
        })
        return
      case 'sign-out':
        this.logger.log(message, {
          userId: event.userId,
          ...(event.everywhere && { everywhere: event.everywhere }),
        })
        return
      case 'password-reset-requested':
        this.logger.log(message, {
          accountFound: event.userId !== undefined,
          ...(event.userId !== undefined && { userId: event.userId }),
        })
        return
      case 'password-reset':
      case 'email-verified':
        this.logger.log(message, { userId: event.userId })
        return
      case 'session-touch-failed':
        this.logger.warn(message, {
          userId: event.userId,
          error:
            event.error instanceof Error
              ? event.error.message
              : String(event.error),
        })
        return
      default:
        this.logger.log(message, { type: event.type })
    }
  }
}
