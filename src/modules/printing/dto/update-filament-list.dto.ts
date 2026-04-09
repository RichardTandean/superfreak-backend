import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class UpdateFilamentListDto {
  @IsOptional()
  @IsString()
  colorName?: string

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
