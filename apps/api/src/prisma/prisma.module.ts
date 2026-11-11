import { Module } from '@nestjs/common'
import { getPrismaClient } from '@repo/db'

import { PRISMA_CLIENT } from './prisma.constants.js'
import { PrismaService } from './prisma.service.js'

@Module({
  providers: [
    { provide: PRISMA_CLIENT, useFactory: getPrismaClient },
    PrismaService,
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
