import { Type } from 'class-transformer'
import {
  IsArray,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'

class OrderItemConfigurationDto {
  @IsString()
  material: string

  @IsOptional()
  @IsString()
  color?: string

  /** Used server-side for resolvePricePerGram; client may send a quote hint in pricing/totalPrice (ignored). */
  @IsOptional()
  @IsString()
  filamentVariantId?: string

  @IsString()
  layerHeight: string

  @IsOptional()
  @IsString()
  infill?: string

  @IsOptional()
  @IsString()
  wallCount?: string
}

class OrderItemStatisticsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  printTime?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  filamentWeight?: number
}

class OrderItemPricingDto {
  @IsNumber()
  @Min(0)
  pricePerGram: number
}

class OrderItemDto {
  @IsString()
  file: string

  @IsString()
  fileName: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  fileSize?: number

  @IsNumber()
  @Min(1)
  @Max(100)
  quantity: number

  @ValidateNested()
  @Type(() => OrderItemConfigurationDto)
  configuration: OrderItemConfigurationDto

  @IsOptional()
  @ValidateNested()
  @Type(() => OrderItemStatisticsDto)
  statistics?: OrderItemStatisticsDto

  /** Client quote; server replaces with trusted pricing in OrdersService.create */
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderItemPricingDto)
  pricing?: OrderItemPricingDto

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPrice?: number
}

class OrderShippingDto {
  @IsString()
  recipientName: string

  @IsString()
  phoneNumber: string

  @IsString()
  addressLine1: string

  @IsOptional()
  @IsString()
  addressLine2?: string

  @IsOptional()
  @IsString()
  villageName?: string

  @IsOptional()
  @IsString()
  districtName?: string

  @IsString()
  regencyName: string

  @IsString()
  provinceName: string

  @IsString()
  postalCode: string

  @IsString()
  courier: string

  @IsString()
  service: string

  @IsOptional()
  @IsString()
  estimatedDelivery?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number

  /** UI hint; not used for server-side totals */
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalWeight?: number
}

/** Client-computed summary; server ignores and uses buildTrustedOrderPricing */
class CreateOrderSummaryDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  subtotal?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingCost?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalWeight?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPrintTime?: number
}

export class CreateOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[]

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateOrderSummaryDto)
  summary?: CreateOrderSummaryDto

  @ValidateNested()
  @Type(() => OrderShippingDto)
  shipping: OrderShippingDto

  @IsOptional()
  @IsObject()
  paymentInfo?: Record<string, unknown>

  @IsOptional()
  @IsString()
  customerNotes?: string
}
