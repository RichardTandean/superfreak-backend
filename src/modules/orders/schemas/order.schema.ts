import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type OrderDocument = Order & Document

const ORDER_STATUSES = [
  'unpaid',
  'in-review',
  'needs-discussion',
  'printing',
  'shipping',
  'in-delivery',
  'delivered',
  'completed',
  'canceled',
] as const

const StatusHistoryItemSchema = {
  status: { type: String, required: true },
  changedAt: { type: Date, required: true },
  changedBy: { type: Types.ObjectId, ref: 'User', required: false },
}

const OrderItemConfigurationSchema = {
  material: { type: String, required: true },
  color: { type: String, required: false },
  layerHeight: { type: String, required: true },
  infill: { type: String, required: false },
  wallCount: { type: String, required: false },
}

const OrderItemStatisticsSchema = {
  printTime: { type: Number, required: false, default: 0 },
  filamentWeight: { type: Number, required: false, default: 0 },
}

const OrderItemPricingSchema = {
  pricePerGram: { type: Number, required: true },
}

const OrderItemSchema = {
  file: { type: String, required: true },
  fileName: { type: String, required: true },
  fileSize: { type: Number, required: false, default: 0 },
  quantity: { type: Number, required: true, min: 1 },
  configuration: { type: OrderItemConfigurationSchema, required: true },
  statistics: { type: OrderItemStatisticsSchema, required: false, default: {} },
  pricing: { type: OrderItemPricingSchema, required: true },
  totalPrice: { type: Number, required: true, min: 0 },
}

const SummarySchema = {
  subtotal: { type: Number, required: true, min: 0 },
  shippingCost: { type: Number, required: true, min: 0 },
  totalAmount: { type: Number, required: true, min: 0 },
  payableAmount: { type: Number, required: true, min: 0 },
  totalWeight: { type: Number, required: true, min: 0 },
  totalPrintTime: { type: Number, required: true, min: 0 },
}

const ShippingSchema = {
  recipientName: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  addressLine1: { type: String, required: true },
  addressLine2: { type: String, required: false },
  villageName: { type: String, required: false },
  districtName: { type: String, required: false },
  regencyName: { type: String, required: true },
  provinceName: { type: String, required: true },
  postalCode: { type: String, required: true },
  courier: { type: String, required: true },
  service: { type: String, required: true },
  estimatedDelivery: { type: String, required: false },
  shippingCost: { type: Number, required: true, min: 0, default: 0 },
}

const PaymentInfoSchema = {
  paymentStatus: { type: String, required: false, default: 'pending' },
  paymentMethod: { type: String, required: false },
  midtransOrderId: { type: String, required: false },
  midtransSnapToken: { type: String, required: false },
  midtransSnapUrl: { type: String, required: false },
  paymentExpiry: { type: String, required: false },
  transactionId: { type: String, required: false },
  paidAt: { type: String, required: false },
}

@Schema({ collection: 'orders', timestamps: true })
export class Order {
  @Prop({ required: true, unique: true })
  orderNumber: string

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  user?: Types.ObjectId

  @Prop({ required: true, enum: ORDER_STATUSES, default: 'unpaid' })
  status: string

  @Prop({ type: [OrderItemSchema], required: true, default: [] })
  items: Record<string, unknown>[]

  @Prop({ type: PaymentInfoSchema, default: { paymentStatus: 'pending' } })
  paymentInfo?: Record<string, unknown>

  @Prop({ type: SummarySchema, required: true })
  summary: Record<string, unknown>

  @Prop({ type: ShippingSchema, required: true })
  shipping?: Record<string, unknown>

  @Prop()
  adminNotes?: string

  @Prop()
  customerNotes?: string

  @Prop({ type: [StatusHistoryItemSchema], default: [] })
  statusHistory: { status: string; changedAt: Date; changedBy?: Types.ObjectId }[]
}

export const OrderSchema = SchemaFactory.createForClass(Order)

OrderSchema.index({ user: 1 })
OrderSchema.index({ orderNumber: 1 }, { unique: true })
