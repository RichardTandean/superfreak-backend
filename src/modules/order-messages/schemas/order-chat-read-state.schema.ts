import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type OrderChatReadStateDocument = OrderChatReadState & Document

@Schema({ collection: 'order-chat-read-state', timestamps: true })
export class OrderChatReadState {
  @Prop({ type: Types.ObjectId, ref: 'Order', required: true })
  order: Types.ObjectId

  @Prop({ type: Date, required: false })
  customerLastReadAt?: Date

  @Prop({ type: Date, required: false })
  adminLastReadAt?: Date
}

export const OrderChatReadStateSchema = SchemaFactory.createForClass(OrderChatReadState)

OrderChatReadStateSchema.index({ order: 1 }, { unique: true })
