import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Order, OrderDocument } from '../orders/schemas/order.schema'
import { OrderMessage, OrderMessageDocument } from './schemas/order-message.schema'
import { CreateOrderMessageDto } from './dto/create-message.dto'
import { OrderChatBroadcastService, OrderMessageSocketPayload } from './order-chat-broadcast.service'

@Injectable()
export class OrderMessagesService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(OrderMessage.name) private readonly messageModel: Model<OrderMessageDocument>,
    private readonly orderChatBroadcast: OrderChatBroadcastService,
  ) {}

  async checkOrderAccess(orderId: string, userId: string, isAdmin: boolean): Promise<OrderDocument | null> {
    const order = await this.orderModel.findById(orderId).exec()
    if (!order) return null
    if (isAdmin || String(order.user) === userId) return order
    return null
  }

  async list(orderId: string, userId: string, isAdmin: boolean) {
    const order = await this.checkOrderAccess(orderId, userId, isAdmin)
    if (!order) throw new NotFoundException('Order not found')

    const docs = await this.messageModel
      .find({ order: orderId })
      .sort({ createdAt: 1 })
      .limit(200)
      .populate('author', 'name email')
      .lean()
      .exec()

    return {
      docs: docs.map((d: any) => ({
        ...d,
        id: d._id.toString(),
        author: d.author
          ? { id: d.author._id.toString(), name: d.author.name, email: d.author.email }
          : d.author?.toString?.(),
      })),
    }
  }

  async create(
    orderId: string,
    userId: string,
    isAdmin: boolean,
    dto: CreateOrderMessageDto,
  ): Promise<Record<string, unknown>> {
    const order = await this.checkOrderAccess(orderId, userId, isAdmin)
    if (!order) throw new NotFoundException('Order not found')
    if (order.status !== 'needs-discussion') {
      throw new BadRequestException(
        'Discussion is only allowed when order status is needs-discussion',
      )
    }

    const doc = await this.messageModel.create({
      order: orderId,
      author: userId,
      body: dto.body.trim(),
    })

    const populated = await this.messageModel
      .findById(doc._id)
      .populate('author', 'name email')
      .lean()
      .exec()

    const out = populated ?? doc.toObject()
    const id = (out as { _id?: { toString: () => string } })._id?.toString() ?? doc._id.toString()
    const socketPayload = this.toSocketPayload(out as Record<string, unknown>, orderId, id)
    this.orderChatBroadcast.emitNewMessage(orderId, socketPayload)

    const preview = doc.body.slice(0, 160)
    if (isAdmin) {
      this.orderChatBroadcast.emitOrderMessageToCustomer(String(order.user), {
        orderId,
        messageId: id,
        preview,
      })
    } else {
      this.orderChatBroadcast.emitOrderMessageToAdmins({
        orderId,
        messageId: id,
        preview,
      })
    }

    return { ...out, id } as Record<string, unknown>
  }

  private toSocketPayload(out: Record<string, unknown>, orderId: string, id: string): OrderMessageSocketPayload {
    const rawAuthor = out.author as
      | { _id?: { toString: () => string }; name?: string; email?: string }
      | string
      | undefined
    let author: OrderMessageSocketPayload['author']
    if (rawAuthor && typeof rawAuthor === 'object' && rawAuthor._id) {
      author = {
        id: rawAuthor._id.toString(),
        name: rawAuthor.name,
        email: rawAuthor.email,
      }
    } else {
      author = { id: typeof rawAuthor === 'string' ? rawAuthor : String(rawAuthor ?? '') }
    }
    const created = out.createdAt
    const createdAt =
      created instanceof Date
        ? created.toISOString()
        : typeof created === 'string'
          ? created
          : new Date().toISOString()
    return {
      id,
      order: orderId,
      body: String(out.body ?? ''),
      createdAt,
      author,
    }
  }
}
