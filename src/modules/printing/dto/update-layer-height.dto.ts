import { IsBoolean, IsNumber, IsOptional } from 'class-validator'

export class UpdateLayerHeightDto {
  @IsOptional()
  @IsNumber()
  value?: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsNumber()
  sortOrder?: number
}
