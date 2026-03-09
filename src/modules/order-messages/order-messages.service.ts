import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Inject } from '@nestjs/common'
import { Model } from 'mongoose'
import Redis from 'ioredis'
import { REDIS_CLIENT } from '../../config/redis.module'
import { Order, OrderDocument } from '../orders/schemas/order.schema'
import { OrderMessage, OrderMessageDocument } from './schemas/order-message.schema'
import { CreateOrderMessageDto } from './dto/create-message.dto'

const ORDER_MESSAGES_CHANNEL_PREFIX = 'order-messages:'

function getOrderMessagesChannel(orderId: string): string {
  return `${ORDER_MESSAGES_CHANNEL_PREFIX}${orderId}`
}

@Injectable()
export class OrderMessagesService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(OrderMessage.name) private readonly messageModel: Model<OrderMessageDocument>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
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

    const payload = {
      id: doc._id.toString(),
      order: orderId,
      author: userId,
      body: doc.body,
      createdAt: (doc as any).createdAt?.toISOString?.() ?? new Date().toISOString(),
    }
    await this.redis.publish(getOrderMessagesChannel(orderId), JSON.stringify(payload))

    const populated = await this.messageModel
      .findById(doc._id)
      .populate('author', 'name email')
      .lean()
      .exec()

    const out = populated ?? doc.toObject()
    return { ...out, id: (out as any)._id.toString() } as Record<string, unknown>
  }

  getChannelName(orderId: string): string {
    return getOrderMessagesChannel(orderId)
  }
}
