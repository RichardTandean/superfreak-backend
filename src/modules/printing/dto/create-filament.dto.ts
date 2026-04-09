import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class CreateFilamentDto {
  @IsString()
  name: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsString()
  description?: string
}
