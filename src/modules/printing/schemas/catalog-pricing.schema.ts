import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type CatalogPricingDocument = CatalogPricing & Document

@Schema({ collection: 'print-catalog-pricings', timestamps: true })
export class CatalogPricing {
  @Prop({ type: Types.ObjectId, ref: 'FilamentList', required: true })
  filamentList: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'LayerHeight', required: true })
  layerHeight: Types.ObjectId

  @Prop({ required: true })
  pricePerGram: number

  @Prop({ default: true })
  isActive: boolean
}

export const CatalogPricingSchema = SchemaFactory.createForClass(CatalogPricing)

CatalogPricingSchema.index({ filamentList: 1, layerHeight: 1 }, { unique: true })
