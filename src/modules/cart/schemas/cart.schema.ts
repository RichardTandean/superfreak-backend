import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types, Schema as MongooseSchema } from 'mongoose'

export type CartDocument = Cart & Document

@Schema({ collection: 'carts', timestamps: true })
export class Cart {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  user: Types.ObjectId

  @Prop({ type: MongooseSchema.Types.Mixed, default: [] })
  items: unknown[]
}

export const CartSchema = SchemaFactory.createForClass(Cart)

CartSchema.index({ user: 1 }, { unique: true })
