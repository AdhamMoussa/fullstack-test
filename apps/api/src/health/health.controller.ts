import { Controller, Get, ServiceUnavailableException } from '@nestjs/common'
import { Public } from '@nestjs/authentication'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'

import { ApiErrorResponse } from '../openapi/api-responses.js'
import { PrismaService } from '../prisma/prisma.service.js'

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly prismaService: PrismaService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness and database readiness' })
  @ApiOkResponse({
    description: 'The API is up and MongoDB answered a ping.',
    schema: {
      type: 'object',
      properties: { status: { type: 'string', example: 'ok' } },
      required: ['status'],
    },
  })
  @ApiErrorResponse(503, 'MongoDB did not answer a ping.')
  async check(): Promise<{ status: 'ok' }> {
    try {
      await this.prismaService.client.$runCommandRaw({ ping: 1 })
    } catch {
      throw new ServiceUnavailableException('Database ping failed.')
    }

    return { status: 'ok' }
  }
}
