import { IsNumber, IsString } from 'class-validator'
import { Type } from 'class-transformer'

export class RajaOngkirCalculateCostDto {
  @IsString()
  destinationId: string

  @Type(() => Number)
  @IsNumber()
  weight: number

  @IsString()
  courier: string
}
