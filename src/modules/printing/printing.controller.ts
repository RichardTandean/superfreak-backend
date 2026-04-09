import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { PrintingService, PrintingQuery } from './printing.service'
import { CreateFilamentDto } from './dto/create-filament.dto'
import { UpdateFilamentDto } from './dto/update-filament.dto'
import { CreateFilamentListDto } from './dto/create-filament-list.dto'
import { UpdateFilamentListDto } from './dto/update-filament-list.dto'
import { CreateLayerHeightDto } from './dto/create-layer-height.dto'
import { UpdateLayerHeightDto } from './dto/update-layer-height.dto'
import { UpsertCatalogPricingDto } from './dto/upsert-catalog-pricing.dto'
import { SessionGuard } from '../auth/guards/session.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'

@Controller('printing')
export class PrintingController {
  constructor(private readonly printing: PrintingService) {}

  @Get('catalog')
  getCatalog(@Query('isActive') isActive?: string) {
    const query: PrintingQuery = {}
    if (isActive !== undefined) query.isActive = isActive === 'true'
    return this.printing.getCatalog(query)
  }

  @Get('filament-types')
  getFilamentTypes(@Query('isActive') isActive?: string) {
    const query: PrintingQuery = {}
    if (isActive !== undefined) query.isActive = isActive === 'true'
    return this.printing.getFilamentTypes(query)
  }

  @Post('filament-types')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  createFilamentType(@Body() dto: CreateFilamentDto): Promise<Record<string, unknown>> {
    return this.printing.createFilamentType(dto)
  }

  @Patch('filament-types/:id')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  updateFilamentType(
    @Param('id') id: string,
    @Body() dto: UpdateFilamentDto,
  ): Promise<Record<string, unknown>> {
    return this.printing.updateFilamentType(id, dto)
  }

  @Delete('filament-types/:id')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  deleteFilamentType(@Param('id') id: string) {
    return this.printing.deleteFilamentType(id)
  }

  @Get('filament-lists')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  listFilamentLists(@Query('isActive') isActive?: string) {
    const query: PrintingQuery = {}
    if (isActive !== undefined) query.isActive = isActive === 'true'
    return this.printing.listFilamentListsAdmin(query)
  }

  @Post('filament-lists')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  createFilamentList(@Body() dto: CreateFilamentListDto) {
    return this.printing.createFilamentList(dto)
  }

  @Patch('filament-lists/:id')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  updateFilamentList(@Param('id') id: string, @Body() dto: UpdateFilamentListDto) {
    return this.printing.updateFilamentList(id, dto)
  }

  @Delete('filament-lists/:id')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  deleteFilamentList(@Param('id') id: string) {
    return this.printing.deleteFilamentList(id)
  }

  @Get('layer-heights')
  listLayerHeights(@Query('isActive') isActive?: string) {
    const query: PrintingQuery = {}
    if (isActive !== undefined) query.isActive = isActive === 'true'
    return this.printing.listLayerHeights(query)
  }

  @Post('layer-heights')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  createLayerHeight(@Body() dto: CreateLayerHeightDto) {
    return this.printing.createLayerHeight(dto)
  }

  @Patch('layer-heights/:id')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  updateLayerHeight(@Param('id') id: string, @Body() dto: UpdateLayerHeightDto) {
    return this.printing.updateLayerHeight(id, dto)
  }

  @Delete('layer-heights/:id')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  deleteLayerHeight(@Param('id') id: string) {
    return this.printing.deleteLayerHeight(id)
  }

  @Get('catalog-pricing')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  listCatalogPricing(@Query('isActive') isActive?: string) {
    const query: PrintingQuery = {}
    if (isActive !== undefined) query.isActive = isActive === 'true'
    return this.printing.listCatalogPricingAdmin(query)
  }

  @Post('catalog-pricing')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  upsertCatalogPricing(@Body() dto: UpsertCatalogPricingDto) {
    return this.printing.upsertCatalogPricing(dto)
  }

  @Delete('catalog-pricing/:id')
  @UseGuards(SessionGuard, RolesGuard)
  @Roles('admin')
  deleteCatalogPricing(@Param('id') id: string) {
    return this.printing.deleteCatalogPricing(id)
  }
}
