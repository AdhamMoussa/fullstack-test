import { Controller, Get } from '@nestjs/common'
import { CurrentUser } from '@nestjs/authentication'
import type { PublicUser } from '@repo/contract'

@Controller('users')
export class UsersController {
  @Get('me')
  me(@CurrentUser() currentUser: PublicUser): PublicUser {
    return currentUser
  }
}
