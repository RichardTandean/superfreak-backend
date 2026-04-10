import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import { Order, OrderDocument } from '../orders/schemas/order.schema'
import { OrderMessage, OrderMessageDocument } from './schemas/order-message.schema'
import {
  OrderChatReadState,
  OrderChatReadStateDocument,
} from './schemas/order-chat-read-state.schema'
import { OrderChatBroadcastService } from './order-chat-broadcast.service'

/** ObjectId, populated lean user `{ _id, email?, name? }`, or string. */
export function orderOwnerUserId(userField: unknown): string {
  if (userField == null || userField === '') return ''
  if (typeof userField === 'string') return userField
  if (typeof userField === 'object' && userField !== null) {
    const o = userField as { _id?: unknown; id?: unknown }
    if (o._id != null) return String(o._id)
    if (o.id != null) return String(o.id)
  }
  return String(userField)
}

@Injectable()
export class OrderChatReadService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(OrderMessage.name) private readonly messageModel: Model<OrderMessageDocument>,
    @InjectModel(OrderChatReadState.name)
    private readonly readStateModel: Model<OrderChatReadStateDocument>,
    private readonly broadcast: OrderChatBroadcastService,
  ) {}

  private async assertOrderAccess(
    orderId: string,
    viewerUserId: string,
    isAdmin: boolean,
  ): Promise<OrderDocument> {
    const order = await this.orderModel.findById(orderId).exec()
    if (!order) throw new NotFoundException('Order not found')
    if (!isAdmin && String(order.user) !== viewerUserId) throw new NotFoundException('Order not found')
    return order
  }

  /**
   * Unread messages from the other party since last read cursor (null cursor = epoch).
   */
  async getUnreadCount(
    orderId: string,
    viewerUserId: string,
    isAdmin: boolean,
    orderOwnerUserId: string,
  ): Promise<number> {
    const readDoc = await this.readStateModel.findOne({ order: orderId }).lean().exec()
    const afterCustomer = readDoc?.customerLastReadAt ?? new Date(0)
    const afterAdmin = readDoc?.adminLastReadAt ?? new Date(0)

    if (isAdmin) {
      return this.messageModel.countDocuments({
        order: new Types.ObjectId(orderId),
        author: new Types.ObjectId(orderOwnerUserId),
        createdAt: { $gt: afterAdmin },
      })
    }

    return this.messageModel.countDocuments({
      order: new Types.ObjectId(orderId),
      author: { $ne: new Types.ObjectId(viewerUserId) },
      createdAt: { $gt: afterCustomer },
    })
  }

  async markRead(
    orderId: string,
    viewerUserId: string,
    isAdmin: boolean,
  ): Promise<{ ok: true; readAt: string; readBy: 'customer' | 'admin' }> {
    const order = await this.assertOrderAccess(orderId, viewerUserId, isAdmin)
    if (order.status !== 'needs-discussion') {
      throw new BadRequestException('Discussion is not active for this order')
    }

    const now = new Date()
    const field = isAdmin ? 'adminLastReadAt' : 'customerLastReadAt'

    await this.readStateModel.updateOne(
      { order: new Types.ObjectId(orderId) },
      {
        $set: { [field]: now },
        $setOnInsert: { order: new Types.ObjectId(orderId) },
      },
      { upsert: true },
    )

    const readBy = isAdmin ? 'admin' : 'customer'
    const readAt = now.toISOString()
    const ownerId = orderOwnerUserId(order.user)
    this.broadcast.emitMessageRead(orderId, { orderId, readBy, readAt }, ownerId)

    return { ok: true, readAt, readBy }
  }

  async enrichOrdersWithDiscussionUnread<
    T extends { id: string; status?: string; user?: unknown; _id?: unknown },
  >(orders: T[], viewerUserId: string, isAdmin: boolean): Promise<Array<T & { discussionUnreadCount: number }>> {
    return Promise.all(
      orders.map(async (o) => {
        if (o.status !== 'needs-discussion') {
          return { ...o, discussionUnreadCount: 0 }
        }
        const id = o.id ?? String(o._id)
        const ownerId = orderOwnerUserId(o.user)
        const count = await this.getUnreadCount(id, viewerUserId, isAdmin, ownerId)
        return { ...o, discussionUnreadCount: count }
      }),
    )
  }
}
