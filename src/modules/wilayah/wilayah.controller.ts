import { Controller, Get, Param, BadRequestException } from '@nestjs/common'
import { WilayahService } from './wilayah.service'

@Controller('wilayah')
export class WilayahController {
  constructor(private readonly wilayah: WilayahService) {}

  @Get('provinces')
  getProvinces() {
    return this.wilayah.getProvinces()
  }

  /**
   * GET /wilayah/regencies/:code
   * GET /wilayah/districts/:code
   * GET /wilayah/villages/:code
   */
  @Get(':type/:code')
  getByTypeAndCode(@Param('type') type: string, @Param('code') code: string) {
    const valid = ['regencies', 'districts', 'villages']
    if (!valid.includes(type)) {
      throw new BadRequestException(
        `Invalid type. Must be one of: ${valid.join(', ')}`,
      )
    }
    if (!code) {
      throw new BadRequestException(`Code parameter is required for ${type}`)
    }
    return this.wilayah.getByTypeAndCode(type, code)
  }
}
