import { Module } from '@nestjs/common'

import { PrismaModule } from '../prisma/prisma.module.js'
import { UsersController } from './users.controller.js'
import { UsersRepository } from './users.repository.js'

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersRepository],
  exports: [UsersRepository],
})
export class UsersModule {}
