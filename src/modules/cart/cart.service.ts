import { Injectable } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Cart, CartDocument } from './schemas/cart.schema'

@Injectable()
export class CartService {
  constructor(@InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>) {}

  async getCart(userId: string): Promise<{ items: unknown[] }> {
    const doc = await this.cartModel.findOne({ user: userId }).lean().exec()
    const items = Array.isArray(doc?.items) ? doc.items : []
    return { items }
  }

  async setCart(userId: string, items: unknown[]): Promise<{ items: unknown[] }> {
    const safeItems = Array.isArray(items) ? items : []
    const doc = await this.cartModel
      .findOneAndUpdate(
        { user: userId },
        { $set: { items: safeItems } },
        { new: true, upsert: true },
      )
      .lean()
      .exec()
    return { items: Array.isArray(doc?.items) ? doc.items : [] }
  }

  async clearCart(userId: string): Promise<{ items: unknown[] }> {
    await this.cartModel
      .findOneAndUpdate({ user: userId }, { $set: { items: [] } }, { new: true })
      .exec()
    return { items: [] }
  }
}
