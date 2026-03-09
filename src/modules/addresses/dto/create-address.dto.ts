import { IsString, IsBoolean, IsOptional, MinLength, Length } from 'class-validator'

export class CreateAddressDto {
  @IsString()
  @MinLength(2)
  recipientName: string

  @IsString()
  @MinLength(1)
  phoneNumber: string

  @IsString()
  @MinLength(1)
  addressLine1: string

  @IsOptional()
  @IsString()
  addressLine2?: string

  @IsString()
  @MinLength(1)
  provinceCode: string

  @IsString()
  @MinLength(1)
  regencyCode: string

  @IsString()
  @MinLength(1)
  districtCode: string

  @IsString()
  @MinLength(1)
  villageCode: string

  @IsString()
  @Length(5, 5, { message: 'Postal code must be 5 digits' })
  postalCode: string

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean
}
