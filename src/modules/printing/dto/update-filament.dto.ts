import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class UpdateFilamentDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsString()
  description?: string
}
