import { Controller, Get } from '@nestjs/common'
import { CurrentUser } from '@nestjs/authentication'
import {
  ApiCookieAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger'
import { userSchema, type User } from '@repo/contract'

import {
  ApiErrorResponse,
  SESSION_COOKIE_SECURITY,
} from '../openapi/api-responses.js'

@ApiTags('users')
@ApiCookieAuth(SESSION_COOKIE_SECURITY)
@Controller('users')
export class UsersController {
  @Get('me')
  @ApiOperation({ summary: 'Get the signed-in user' })
  @ApiOkResponse({ standardSchema: userSchema })
  @ApiErrorResponse(401, 'No valid session cookie.')
  me(@CurrentUser() currentUser: User): User {
    return currentUser
  }
}
