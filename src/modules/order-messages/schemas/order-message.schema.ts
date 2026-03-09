import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type OrderMessageDocument = OrderMessage & Document

@Schema({ collection: 'order-messages', timestamps: true })
export class OrderMessage {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  order: Types.ObjectId

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  author: Types.ObjectId

  @Prop({ required: true })
  body: string
}

export const OrderMessageSchema = SchemaFactory.createForClass(OrderMessage)

OrderMessageSchema.index({ order: 1, createdAt: 1 })
