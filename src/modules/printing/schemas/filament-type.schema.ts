import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type FilamentTypeDocument = FilamentType & Document

const ColorSchema = {
  name: { type: String, required: true },
  hexCode: { type: String, required: false },
}

@Schema({ collection: 'filament-types', timestamps: true })
export class FilamentType {
  @Prop({ required: true })
  name: string

  @Prop({ type: [ColorSchema], default: [] })
  colors?: { name: string; hexCode?: string }[]

  @Prop({ default: true })
  isActive: boolean

  @Prop()
  description?: string
}

export const FilamentTypeSchema = SchemaFactory.createForClass(FilamentType)
