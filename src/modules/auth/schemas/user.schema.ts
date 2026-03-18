import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Schema as MongooseSchema } from 'mongoose'

export type UserDocument = User & Document

/** Normalize role from DB (may be string or array from Payload CMS). */
function normalizeRole(v: unknown): 'user' | 'admin' {
  const r = Array.isArray(v) ? v[0] : v
  return r === 'admin' ? 'admin' : 'user'
}

@Schema({ collection: 'app-users', timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string

  @Prop({ required: true })
  name: string

  @Prop({ required: false, select: false })
  password?: string

  @Prop({
    type: MongooseSchema.Types.Mixed,
    default: 'user',
    get: normalizeRole,
    set: (v: unknown) => (Array.isArray(v) ? v[0] : v),
    enum: ['user', 'admin'],
  })
  role: 'user' | 'admin'

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
