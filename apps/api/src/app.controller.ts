import { Controller, Get } from '@nestjs/common'
import { Public } from '@nestjs/authentication'
import { ApiOkResponse, ApiProduces, ApiTags } from '@nestjs/swagger'

import { AppService } from './app.service.js'

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Public()
  @Get()
  @ApiOkResponse({
    description: 'Scaffold endpoint; returns the text Hello World!',
    schema: { type: 'string', example: 'Hello World!' },
  })
  @ApiProduces('text/plain')
  getHello(): string {
    return this.appService.getHello()
  }
}
