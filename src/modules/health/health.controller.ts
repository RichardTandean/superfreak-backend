import { Controller, Get, HttpCode, HttpStatus, ServiceUnavailableException } from '@nestjs/common'
import { HealthService, HealthResult } from './health.service'

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async get(): Promise<HealthResult> {
    const result = await this.health.check()
    if (result.status === 'error') {
      throw new ServiceUnavailableException(result)
    }
    return result
  }
}
