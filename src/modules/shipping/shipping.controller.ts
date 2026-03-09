import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { ShippingService } from './shipping.service'
import { BiteshipRatesDto } from './dto/biteship-rates.dto'
import { RajaOngkirCalculateCostDto } from './dto/rajaongkir-calculate-cost.dto'

@Controller('shipping')
export class ShippingController {
  constructor(private readonly shipping: ShippingService) {}

  @Post('biteship/rates')
  async biteshipRates(@Body() dto: BiteshipRatesDto) {
    if (!dto.destinationPostalCode || !dto.weight) {
      throw new BadRequestException({
        error: 'Missing required fields',
        details: 'destinationPostalCode, weight, and courier or couriers (array) are required',
      })
    }
    const couriers = dto.couriers ?? (dto.courier ? [dto.courier] : [])
    if (couriers.length === 0) {
      throw new BadRequestException({
        error: 'Missing required fields',
        details: 'courier or couriers (array) is required',
      })
    }
    try {
      return await this.shipping.getBiteshipRates({
        destinationPostalCode: Number(dto.destinationPostalCode),
        weight: Number(dto.weight),
        courier: dto.courier,
        couriers: dto.couriers,
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      if (message.includes('not configured')) {
        throw new HttpException({ error: message }, HttpStatus.INTERNAL_SERVER_ERROR)
      }
      throw new HttpException(
        { error: 'Failed to get shipping rates', details: message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  @Post('rajaongkir/calculate-cost')
  async rajaongkirCalculateCost(@Body() dto: RajaOngkirCalculateCostDto) {
    if (!dto.destinationId || !dto.weight || !dto.courier) {
      throw new BadRequestException({
        error: 'Missing required fields',
        details: 'destinationId, weight, and courier are required',
      })
    }
    try {
      return await this.shipping.getRajaOngkirCost({
        destinationId: String(dto.destinationId),
        weight: Number(dto.weight),
        courier: String(dto.courier),
      })
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      if (message.includes('not configured')) {
        throw new HttpException({ error: message }, HttpStatus.INTERNAL_SERVER_ERROR)
      }
      throw new HttpException(
        { error: 'Failed to calculate shipping cost', details: message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }

  @Get('rajaongkir/search-destination')
  async rajaongkirSearchDestination(
    @Query('query') query: string | undefined,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (!query) {
      throw new BadRequestException({ error: 'Query parameter is required' })
    }
    try {
      return await this.shipping.searchRajaOngkirDestination(
        query,
        limit ? parseInt(limit, 10) : 20,
        offset ? parseInt(offset, 10) : 0,
      )
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error'
      if (message.includes('not configured')) {
        throw new HttpException({ error: message }, HttpStatus.INTERNAL_SERVER_ERROR)
      }
      throw new HttpException(
        { error: 'Failed to search location', details: message },
        HttpStatus.INTERNAL_SERVER_ERROR,
      )
    }
  }
}
