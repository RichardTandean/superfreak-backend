import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document } from 'mongoose'

export type PrintingOptionDocument = PrintingOption & Document

const OptionValueSchema = {
  label: { type: String, required: true },
  value: { type: String, required: true },
  isActive: { type: Boolean, default: true },
}

@Schema({ collection: 'printing-options', timestamps: true })
export class PrintingOption {
  @Prop({ required: true, enum: ['infill', 'wallCount'] })
  type: 'infill' | 'wallCount'

  @Prop({ type: [OptionValueSchema], default: [] })
  values?: { label: string; value: string; isActive?: boolean }[]

  @Prop()
  maxValue?: number

  @Prop({ default: true })
  isActive: boolean

  @Prop()
  description?: string
}

export const PrintingOptionSchema = SchemaFactory.createForClass(PrintingOption)
