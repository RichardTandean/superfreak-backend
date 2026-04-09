import { IsBoolean, IsOptional, IsString } from 'class-validator'

/** Mongo subdocuments may include `_id`; accepted for validation, stripped on persist. */
export class PrintingOptionValueDto {
  @IsString()
  label: string

  @IsString()
  value: string

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsString()
  _id?: string
}
