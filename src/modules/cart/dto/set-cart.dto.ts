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

/** Matches frontend cart / upload flow (ConfigureModal, OrderForm). */
class CartItemConfigurationDto {
  @IsOptional()
  @IsString()
  material?: string

  @IsOptional()
  @IsString()
  color?: string

  @IsOptional()
  @IsString()
  filamentVariantId?: string

  @IsOptional()
  @IsString()
  layerHeight?: string

  @IsOptional()
  @IsString()
  infill?: string

  @IsOptional()
  @IsString()
  wallCount?: string

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  quantity?: number

  @IsOptional()
  @IsBoolean()
  enabled?: boolean

  @IsOptional()
  @IsBoolean()
  support?: boolean

  @IsOptional()
  @IsString()
  specialRequest?: string

  @IsOptional()
  @IsString()
  colorHex?: string
}

class CartItemStatisticsDto {
  /** Present when statistics object is the raw SuperSlice JSON response. */
  @IsOptional()
  @IsBoolean()
  success?: boolean

  @IsOptional()
  @IsNumber()
  @Min(0)
  print_time_minutes?: number

  @IsOptional()
  @IsString()
  print_time_formatted?: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  filament_length_mm?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  filament_volume_cm3?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  filament_weight_g?: number

  @IsOptional()
  @IsString()
  filament_type?: string

  @IsOptional()
  @IsNumber()
  layer_height?: number

  @IsOptional()
  @IsNumber()
  infill_density?: number

  @IsOptional()
  @IsNumber()
  wall_count?: number
}

class CartItemDto {
  @IsString()
  id: string

  @IsString()
  name: string

  @IsOptional()
  @IsNumber()
  @Min(0)
  size?: number

  @IsOptional()
  @IsString()
  tempFileId?: string

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  quantity?: number

  @IsOptional()
  @ValidateNested()
  @Type(() => CartItemConfigurationDto)
  configuration?: CartItemConfigurationDto

  @IsOptional()
  @ValidateNested()
  @Type(() => CartItemStatisticsDto)
  statistics?: CartItemStatisticsDto
}

export class SetCartDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[]
}
