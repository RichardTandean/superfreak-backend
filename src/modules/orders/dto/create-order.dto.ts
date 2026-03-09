import { IsArray, IsObject, IsOptional, IsString, MinLength } from 'class-validator'

export class CreateOrderDto {
  @IsArray()
  items: unknown[]

  @IsObject()
  summary: Record<string, unknown>

  @IsOptional()
  @IsObject()
  shipping?: Record<string, unknown>

  @IsOptional()
  @IsObject()
  paymentInfo?: Record<string, unknown>

  @IsOptional()
  @IsString()
  customerNotes?: string
}
