import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type LayerHeightDocument = LayerHeight & Document

@Schema({ collection: 'layer-heights', timestamps: true })
export class LayerHeight {
  /** Layer height in mm (e.g. 0.12, 0.2) */
  @Prop({ required: true })
  value: number

  @Prop({ default: true })
  isActive: boolean

  @Prop({ default: 0 })
  sortOrder: number
}

export const LayerHeightSchema = SchemaFactory.createForClass(LayerHeight)

LayerHeightSchema.index({ value: 1 }, { unique: true })
