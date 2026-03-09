import { IsString, IsArray, IsOptional } from 'class-validator'

export class FinalizeFilesDto {
  @IsOptional()
  @IsString()
  orderId?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tempFileIds?: string[]
}
