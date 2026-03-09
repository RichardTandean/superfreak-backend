import { IsOptional, IsString, IsIn } from 'class-validator'

const STATUSES = [
  'unpaid',
  'in-review',
  'needs-discussion',
  'printing',
  'shipping',
  'in-delivery',
  'delivered',
  'completed',
  'canceled',
]

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  @IsIn(STATUSES)
  status?: string

  @IsOptional()
  @IsString()
  adminNotes?: string

  @IsOptional()
  @IsString()
  customerNotes?: string
}
