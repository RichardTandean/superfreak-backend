import { IsOptional, IsString } from 'class-validator'

export class MidtransWebhookDto {
  @IsString()
  order_id: string

  @IsString()
  status_code: string

  @IsString()
  gross_amount: string

  @IsString()
  signature_key: string

  @IsOptional()
  @IsString()
  transaction_status?: string

  @IsOptional()
  @IsString()
  fraud_status?: string

  @IsOptional()
  @IsString()
  payment_type?: string
}
