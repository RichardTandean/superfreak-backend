import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'

export class PricingTableRowDto {
  @IsNumber()
  @Min(0.01)
  @Max(1)
  layerHeight: number

  @IsNumber()
  @Min(0)
  pricePerGram: number
}

export class UpsertPricingDto {
  /** Mongo ObjectId of FilamentType */
  @IsString()
  filamentTypeId: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingTableRowDto)
  pricingTable: PricingTableRowDto[]

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsString()
  title?: string
}
