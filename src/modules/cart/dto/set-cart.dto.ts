import { IsArray } from 'class-validator'

export class SetCartDto {
  @IsArray()
  items: unknown[]
}
