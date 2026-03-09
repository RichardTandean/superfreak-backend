import { IsString, MinLength } from 'class-validator'

export class CreateOrderMessageDto {
  @IsString()
  @MinLength(1, { message: 'Message body is required' })
  body: string
}
