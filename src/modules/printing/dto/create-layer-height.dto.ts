import { IsBoolean, IsNumber, IsOptional } from 'class-validator'

export class CreateLayerHeightDto {
  @IsNumber()
  value: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsNumber()
  sortOrder?: number
}
