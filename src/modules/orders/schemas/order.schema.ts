import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types, Schema as MongooseSchema } from 'mongoose'

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

@Schema({ collection: 'orders', timestamps: true })
export class Order {
  @Prop({ required: true, unique: true })
  orderNumber: string

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  user?: Types.ObjectId

  @Prop({ required: true, enum: ORDER_STATUSES, default: 'unpaid' })
  status: string

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  items: unknown[]

  @Prop({ type: MongooseSchema.Types.Mixed })
  paymentInfo?: Record<string, unknown>

  @Prop({ type: MongooseSchema.Types.Mixed, required: true })
  summary: Record<string, unknown>

  @Prop({ type: MongooseSchema.Types.Mixed })
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
