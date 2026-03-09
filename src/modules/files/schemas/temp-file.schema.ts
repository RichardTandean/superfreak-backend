import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type TempFileDocument = TempFile & Document

@Schema({ collection: 'temp-files', timestamps: true })
export class TempFile {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId

  @Prop({ required: true })
  key: string

  @Prop({ required: true })
  fileName: string

  @Prop({ required: true })
  fileSize: number

  @Prop({ required: true })
  expiresAt: Date
}

export const TempFileSchema = SchemaFactory.createForClass(TempFile)

TempFileSchema.index({ expiresAt: 1 })
TempFileSchema.index({ userId: 1 })
