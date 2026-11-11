import { ServiceUnavailableException } from '@nestjs/common'
import { describe, expect, it, vi } from 'vitest'

import type { PrismaService } from '../prisma/prisma.service.js'
import { HealthController } from './health.controller.js'

const createController = (runCommandRaw: ReturnType<typeof vi.fn>) =>
  new HealthController({
    client: { $runCommandRaw: runCommandRaw },
  } as unknown as PrismaService)

describe('HealthController', () => {
  it('returns ok when MongoDB answers a ping', async () => {
    const runCommandRaw = vi.fn().mockResolvedValue({ ok: 1 })
    const controller = createController(runCommandRaw)

    await expect(controller.check()).resolves.toEqual({ status: 'ok' })
    expect(runCommandRaw).toHaveBeenCalledWith({ ping: 1 })
  })

  it('throws service unavailable when the ping fails', async () => {
    const runCommandRaw = vi.fn().mockRejectedValue(new Error('no connection'))
    const controller = createController(runCommandRaw)

    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    )
  })
})
