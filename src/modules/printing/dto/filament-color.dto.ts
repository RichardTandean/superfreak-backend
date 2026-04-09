import { IsOptional, IsString } from 'class-validator'

/** Subdocument colors from Mongo may include `_id`; we accept it for validation then strip on save. */
export class FilamentColorDto {
  @IsString()
  name: string

  @IsOptional()
  @IsString()
  hexCode?: string

  @IsOptional()
  @IsString()
  _id?: string
}
