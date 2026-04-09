import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type FilamentListDocument = FilamentList & Document

@Schema({ collection: 'filament-lists', timestamps: true })
export class FilamentList {
  @Prop({ type: Types.ObjectId, ref: 'FilamentType', required: true })
  filamentType: Types.ObjectId

  @Prop({ required: true })
  colorName: string

  @Prop()
  hexCode?: string

  /** Admin-only; omit from public catalog API */
  @Prop()
  brand?: string

  @Prop({ default: true })
  isActive: boolean
}

export const FilamentListSchema = SchemaFactory.createForClass(FilamentList)

FilamentListSchema.index({ filamentType: 1, colorName: 1 })
