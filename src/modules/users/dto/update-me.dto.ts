import { IsOptional, IsString, MinLength } from 'class-validator'

export class UpdateMeDto {
  @IsString()
  @MinLength(2, { message: 'Name must be at least 2 characters' })
  name: string

  @IsOptional()
  @IsString()
  phoneNumber?: string
}
