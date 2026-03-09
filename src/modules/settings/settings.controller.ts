import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common'
import { SettingsService } from './settings.service'
import { UpdateCourierSettingsDto } from './dto/update-courier.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'

@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('courier')
  getCourier() {
    return this.settings.getCourier()
  }

  @Patch('courier')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  updateCourier(@Body() dto: UpdateCourierSettingsDto) {
    return this.settings.updateCourier(dto)
  }
}
