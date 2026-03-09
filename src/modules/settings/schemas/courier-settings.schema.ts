import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type CourierSettingsDocument = CourierSettings & Document

const COURIER_VALUES = [
  'jne', 'jnt', 'sicepat', 'ide', 'sap', 'ninja', 'tiki', 'lion',
  'anteraja', 'pos', 'ncs', 'rex', 'rpx', 'sentral', 'star', 'wahana', 'dse',
] as const

const CourierDisplayOrderItemSchema = {
  courier: { type: String, enum: COURIER_VALUES, required: true },
  priority: { type: Number, required: false },
}

const PricingSettingsSchema = {
  filamentCostPerGram: { type: Number, required: true, default: 100 },
  printTimeCostPerHour: { type: Number, required: true, default: 10000 },
  markupPercentage: { type: Number, required: true, default: 30 },
}

@Schema({ collection: 'courier-settings', timestamps: true })
export class CourierSettings {
  @Prop()
  warehousePostalCode?: string

  @Prop()
  warehouseId?: number

  @Prop()
  warehouseName?: string

  @Prop()
  warehouseAddress?: string

  @Prop({ type: [String], enum: COURIER_VALUES, default: ['jne', 'jnt', 'sicepat'] })
  enabledCouriers: string[]

  @Prop({ type: [CourierDisplayOrderItemSchema], default: [] })
  courierDisplayOrder?: { courier: string; priority?: number }[]

  @Prop({ type: PricingSettingsSchema, required: true })
  pricingSettings: {
    filamentCostPerGram: number
    printTimeCostPerHour: number
    markupPercentage: number
  }

  @Prop()
  freeShippingThreshold?: number

  @Prop({ enum: ['', 'jne', 'jnt', 'sicepat'] })
  defaultShippingService?: string

  @Prop({ required: true, default: 1 })
  estimatedProcessingDays: number
}

export const CourierSettingsSchema = SchemaFactory.createForClass(CourierSettings)
