import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type UserFileDocument = UserFile & Document

@Schema({ collection: 'user-files', timestamps: true })
export class UserFile {
  @Prop({ required: true })
  filename: string

  @Prop({ default: 'other', enum: ['stl', 'obj', 'glb', 'fbx', 'other'] })
  fileType: string

  @Prop()
  description?: string

  @Prop({ required: true })
  url: string
}

export const UserFileSchema = SchemaFactory.createForClass(UserFile)
