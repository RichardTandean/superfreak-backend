import { Controller, Get, Query } from '@nestjs/common'
import { PrintingService, PrintingQuery } from './printing.service'

@Controller('printing')
export class PrintingController {
  constructor(private readonly printing: PrintingService) {}

  @Get('filament-types')
  getFilamentTypes(@Query('isActive') isActive?: string) {
    const query: PrintingQuery = {}
    if (isActive !== undefined) query.isActive = isActive === 'true'
    return this.printing.getFilamentTypes(query)
  }

  @Get('options')
  getOptions(@Query('isActive') isActive?: string) {
    const query: PrintingQuery = {}
    if (isActive !== undefined) query.isActive = isActive === 'true'
    return this.printing.getOptions(query)
  }

  @Get('pricing')
  getPricing(@Query('isActive') isActive?: string) {
    const query: PrintingQuery = {}
    if (isActive !== undefined) query.isActive = isActive === 'true'
    return this.printing.getPricing(query)
  }
}
