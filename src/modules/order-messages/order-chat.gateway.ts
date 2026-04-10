import { Logger } from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model, Types } from 'mongoose'
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WsException,
} from '@nestjs/websockets'
import type { Server, Socket } from 'socket.io'
import * as cookie from 'cookie'
import { SkipThrottle } from '@nestjs/throttler'
import { SessionService } from '../auth/session.service'
import { AuthService } from '../auth/auth.service'
import { isAdminUser } from '../auth/utils/admin.util'
import { Order, OrderDocument } from '../orders/schemas/order.schema'
import { OrderChatBroadcastService } from './order-chat-broadcast.service'

const COOKIE_NAME = 'sid'

@SkipThrottle()
@WebSocketGateway({
  namespace: '/order-chat',
  cors: true,
})
export class OrderChatGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(OrderChatGateway.name)

  constructor(
    private readonly broadcast: OrderChatBroadcastService,
    private readonly sessionService: SessionService,
    private readonly authService: AuthService,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
  ) {}

  afterInit(server: Server): void {
    this.broadcast.setServer(server)
  }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const raw = client.handshake.headers.cookie ?? ''
      const cookies = cookie.parse(raw)
      const sessionId = cookies[COOKIE_NAME]
      if (!sessionId) {
        this.logger.debug('Socket connection rejected: no session cookie')
        client.disconnect(true)
        return
      }

      const session = await this.sessionService.getSession(sessionId)
      if (!session) {
        client.disconnect(true)
        return
      }

      const user = await this.authService.validateUserById(session.userId)
      if (!user) {
        client.disconnect(true)
        return
      }

      const userId = user._id.toString()
      const admin = isAdminUser(user)
      client.data.userId = userId
      client.data.isAdmin = admin

      await client.join(`user:${userId}`)
      if (admin) {
        await client.join('admin:inbox')
      }

      this.logger.debug(`Socket connected user=${userId} admin=${admin}`)
    } catch (e) {
      this.logger.warn(`Socket connection error: ${e instanceof Error ? e.message : e}`)
      client.disconnect(true)
    }
  }

  @SubscribeMessage('join_order')
  async joinOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { orderId?: string },
  ): Promise<{ ok: true; orderId: string }> {
    const orderId = body?.orderId
    if (!orderId || !Types.ObjectId.isValid(orderId)) {
      throw new WsException('Invalid orderId')
    }

    const userId = client.data.userId as string | undefined
    const isAdmin = Boolean(client.data.isAdmin)
    if (!userId) {
      throw new WsException('Unauthorized')
    }

    const order = await this.orderModel.findById(orderId).exec()
    if (!order) {
      throw new WsException('Order not found')
    }

    if (!isAdmin && String(order.user) !== userId) {
      throw new WsException('Forbidden')
    }

    if (order.status !== 'needs-discussion') {
      throw new WsException('Discussion is not active for this order')
    }

    await client.join(`order:${orderId}`)
    return { ok: true, orderId }
  }

  @SubscribeMessage('leave_order')
  async leaveOrder(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { orderId?: string },
  ): Promise<{ ok: true }> {
    const orderId = body?.orderId
    if (orderId) {
      await client.leave(`order:${orderId}`)
    }
    return { ok: true }
  }
}
