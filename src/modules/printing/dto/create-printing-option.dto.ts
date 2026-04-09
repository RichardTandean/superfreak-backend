import { Type } from 'class-transformer'
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator'
import { PrintingOptionValueDto } from './printing-option-value.dto'

export class CreatePrintingOptionDto {
  @IsIn(['infill', 'wallCount'])
  type: 'infill' | 'wallCount'

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrintingOptionValueDto)
  values?: PrintingOptionValueDto[]

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  maxValue?: number

  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @IsOptional()
  @IsString()
  description?: string
}
