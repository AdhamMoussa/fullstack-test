import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common'
import type { PrismaClient } from '@repo/db'

import { PRISMA_CLIENT } from './prisma.constants.js'

@Injectable()
export class PrismaService implements OnModuleDestroy {
  constructor(@Inject(PRISMA_CLIENT) readonly client: PrismaClient) {}

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect()
  }
}
