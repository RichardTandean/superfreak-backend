import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class CreateFilamentListDto {
  @IsString()
  filamentTypeId: string

  @IsString()
  colorName: string

  @IsOptional()
  @IsString()
  hexCode?: string

  @IsOptional()
  @IsString()
  brand?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
