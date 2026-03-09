import { IsArray, IsNumber, IsOptional, IsString, Min, Max } from 'class-validator'

export class UpdateCourierSettingsDto {
  @IsOptional()
  @IsString()
  warehousePostalCode?: string

  @IsOptional()
  @IsNumber()
  warehouseId?: number

  @IsOptional()
  @IsString()
  warehouseName?: string

  @IsOptional()
  @IsString()
  warehouseAddress?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  enabledCouriers?: string[]

  @IsOptional()
  @IsArray()
  courierDisplayOrder?: { courier: string; priority?: number }[]

  @IsOptional()
  pricingSettings?: {
    filamentCostPerGram?: number
    printTimeCostPerHour?: number
    markupPercentage?: number
  }

  @IsOptional()
  @IsNumber()
  @Min(0)
  freeShippingThreshold?: number

  @IsOptional()
  @IsString()
  defaultShippingService?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  estimatedProcessingDays?: number
}
