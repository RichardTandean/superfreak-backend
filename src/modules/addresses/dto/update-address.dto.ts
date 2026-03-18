import { IsString, IsBoolean, IsOptional, MinLength, Length, IsNumber, IsDateString } from 'class-validator'

export class UpdateAddressDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  recipientName?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  phoneNumber?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  addressLine1?: string

  @IsOptional()
  @IsString()
  addressLine2?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  provinceCode?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  regencyCode?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  districtCode?: string

  @IsOptional()
  @IsString()
  @MinLength(1)
  villageCode?: string

  @IsOptional()
  @IsString()
  @Length(5, 5, { message: 'Postal code must be 5 digits' })
  postalCode?: string

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean

  // Optional RajaOngkir metadata (legacy/supporting fields already present in schema)
  @IsOptional()
  @IsNumber()
  rajaOngkirDestinationId?: number

  @IsOptional()
  @IsString()
  rajaOngkirLocationLabel?: string

  @IsOptional()
  @IsString()
  rajaOngkirZipCode?: string

  @IsOptional()
  @IsDateString()
  rajaOngkirLastVerified?: string

  @IsOptional()
  @IsString()
  rajaOngkirProvinceName?: string

  @IsOptional()
  @IsString()
  rajaOngkirCityName?: string

  @IsOptional()
  @IsString()
  rajaOngkirDistrictName?: string

  @IsOptional()
  @IsString()
  rajaOngkirSubdistrictName?: string
}
