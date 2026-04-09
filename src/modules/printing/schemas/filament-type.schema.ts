import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type FilamentTypeDocument = FilamentType & Document

@Schema({ collection: 'filament-types', timestamps: true })
export class FilamentType {
  @Prop({ required: true })
  name: string

  @Prop({ default: true })
  isActive: boolean

  @Prop()
  description?: string
}

export const FilamentTypeSchema = SchemaFactory.createForClass(FilamentType)
