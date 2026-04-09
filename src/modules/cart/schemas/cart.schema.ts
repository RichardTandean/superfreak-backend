import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type CartDocument = Cart & Document

const CartItemConfigurationSchema = {
  material: { type: String, required: false },
  color: { type: String, required: false },
  filamentVariantId: { type: String, required: false },
  layerHeight: { type: String, required: false },
  infill: { type: String, required: false },
  wallCount: { type: String, required: false },
  quantity: { type: Number, required: false, min: 1 },
  enabled: { type: Boolean, required: false },
  support: { type: Boolean, required: false },
  specialRequest: { type: String, required: false },
  colorHex: { type: String, required: false },
}

const CartItemStatisticsSchema = {
  success: { type: Boolean, required: false },
  print_time_minutes: { type: Number, required: false },
  print_time_formatted: { type: String, required: false },
  filament_length_mm: { type: Number, required: false },
  filament_volume_cm3: { type: Number, required: false },
  filament_weight_g: { type: Number, required: false },
  filament_type: { type: String, required: false },
  layer_height: { type: Number, required: false },
  infill_density: { type: Number, required: false },
  wall_count: { type: Number, required: false },
}

const CartItemSchema = {
  id: { type: String, required: true },
  name: { type: String, required: true },
  size: { type: Number, required: false, default: 0 },
  tempFileId: { type: String, required: false },
  quantity: { type: Number, required: false, default: 1, min: 1 },
  configuration: { type: CartItemConfigurationSchema, required: false, default: {} },
  statistics: { type: CartItemStatisticsSchema, required: false, default: undefined },
}

@Schema({ collection: 'carts', timestamps: true })
export class Cart {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  user: Types.ObjectId

  @Prop({ type: [CartItemSchema], default: [] })
  items: Record<string, unknown>[]
}

export const CartSchema = SchemaFactory.createForClass(Cart)

CartSchema.index({ user: 1 }, { unique: true })
