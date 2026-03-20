import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type UserDocument = User & Document

@Schema({ collection: 'app-users', timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string

  @Prop({ required: true })
  name: string

  @Prop({ required: false, select: false })
  password?: string

  @Prop({ type: String, default: 'user', enum: ['user', 'admin'] })
  role: 'user' | 'admin'

  @Prop({ sparse: true })
  googleId?: string

  @Prop()
  image?: string

  @Prop()
  phoneNumber?: string

  @Prop({ default: Date.now })
  createdAt: Date

  @Prop({ default: Date.now })
  updatedAt: Date
}

export const UserSchema = SchemaFactory.createForClass(User)

UserSchema.index({ email: 1 }, { unique: true })
UserSchema.index({ googleId: 1 }, { unique: true, sparse: true })
