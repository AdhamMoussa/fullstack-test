import { Controller, Get, HttpCode, Post } from '@nestjs/common'
import { CurrentUser, EmailVerificationService } from '@nestjs/authentication'
import {
  ApiAcceptedResponse,
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { userSchema, type User } from '@repo/contract'

import {
  ApiErrorResponse,
  ApiUntrustedOriginResponse,
  SESSION_COOKIE_SECURITY,
} from '../openapi/api-responses.js'

@ApiTags('users')
@ApiCookieAuth(SESSION_COOKIE_SECURITY)
@Controller('users')
export class UsersController {
  constructor(
    private readonly emailVerificationService: EmailVerificationService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the signed-in user' })
  @ApiOkResponse({ standardSchema: userSchema })
  @ApiErrorResponse(401, 'No valid session cookie.')
  me(@CurrentUser() currentUser: User): User {
    return currentUser
  }

  @Post('me/email-verification')
  @HttpCode(202)
  @ApiOperation({ summary: 'Send a new email verification link' })
  @ApiAcceptedResponse({
    description:
      'A new link was sent, unless the address is already verified (then nothing is sent).',
  })
  @ApiErrorResponse(401, 'No valid session cookie.')
  @ApiUntrustedOriginResponse()
  async sendVerificationEmail(@CurrentUser() currentUser: User): Promise<void> {
    if (currentUser.emailVerified) {
      return
    }

    await this.emailVerificationService.send({
      id: currentUser.id,
      email: currentUser.email,
    })
  }
}
