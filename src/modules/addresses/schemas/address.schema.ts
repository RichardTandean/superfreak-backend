import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'
import { Document, Types } from 'mongoose'

export type AddressDocument = Address & Document

@Schema({ collection: 'addresses', timestamps: true })
export class Address {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user: Types.ObjectId

  @Prop({ required: true })
  recipientName: string

  @Prop({ required: true })
  phoneNumber: string

  @Prop({ required: true })
  addressLine1: string

  @Prop()
  addressLine2?: string

  @Prop({ required: true })
  provinceCode: string

  @Prop({ required: true })
  regencyCode: string

  @Prop({ required: true })
  districtCode: string

  @Prop({ required: true })
  villageCode: string

  @Prop({ required: true })
  postalCode: string

  @Prop({ default: false })
  isDefault: boolean

  @Prop()
  rajaOngkirDestinationId?: number

  @Prop()
  rajaOngkirLocationLabel?: string

  @Prop()
  rajaOngkirZipCode?: string

  @Prop()
  rajaOngkirLastVerified?: Date

  @Prop()
  rajaOngkirProvinceName?: string

  @Prop()
  rajaOngkirCityName?: string

  @Prop()
  rajaOngkirDistrictName?: string

  @Prop()
  rajaOngkirSubdistrictName?: string
}

export const AddressSchema = SchemaFactory.createForClass(Address)

AddressSchema.index({ user: 1 })
AddressSchema.index(
  { user: 1, isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true },
  },
)
