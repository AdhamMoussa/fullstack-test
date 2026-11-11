import { Controller, Get } from '@nestjs/common'
import { CurrentUser } from '@nestjs/authentication'
import type { User } from '@repo/contract'

@Controller('users')
export class UsersController {
  @Get('me')
  me(@CurrentUser() currentUser: User): User {
    return currentUser
  }
}
