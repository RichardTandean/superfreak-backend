import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type PrintingPricingDocument = PrintingPricing & Document

const PricingRowSchema = {
  layerHeight: { type: Number, required: true },
  pricePerGram: { type: Number, required: true },
}

// NOTE: Mongo collection name is plural in this project.
// This must match the real collection name so Nest endpoints return pricingTable rows.
@Schema({ collection: 'printing-pricings', timestamps: true })
export class PrintingPricing {
  @Prop({ type: Types.ObjectId, ref: 'FilamentType', required: true })
  filamentType: Types.ObjectId

  @Prop({ type: [PricingRowSchema], required: true })
  pricingTable: { layerHeight: number; pricePerGram: number }[]

  @Prop({ default: true })
  isActive: boolean

  @Prop()
  title?: string
}

export const PrintingPricingSchema = SchemaFactory.createForClass(PrintingPricing)

PrintingPricingSchema.index({ filamentType: 1 })
