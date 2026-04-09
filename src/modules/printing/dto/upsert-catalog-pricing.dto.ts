import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator'

export class UpsertCatalogPricingDto {
  @IsString()
  filamentListId: string

  @IsString()
  layerHeightId: string

  @IsNumber()
  pricePerGram: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
