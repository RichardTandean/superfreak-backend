import { IsString, IsOptional, IsIn } from 'class-validator'

export class InitializePaymentDto {
  @IsString()
  orderId: string

  @IsOptional()
  @IsString()
  @IsIn(['bank_transfer', 'credit_card', 'e_wallet'])
  paymentMethod?: string
}
