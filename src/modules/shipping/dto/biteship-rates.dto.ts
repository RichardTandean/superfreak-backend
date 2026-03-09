import { IsNumber, IsString, IsOptional, IsArray } from 'class-validator'
import { Type } from 'class-transformer'

export class BiteshipRatesDto {
  @Type(() => Number)
  @IsNumber()
  destinationPostalCode: number

  @Type(() => Number)
  @IsNumber()
  weight: number

  @IsOptional()
  @IsString()
  courier?: string

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  couriers?: string[]
}
