import { Injectable, Logger } from '@nestjs/common'
import type { Server } from 'socket.io'

export type OrderMessageSocketPayload = {
  id: string
  order: string
  body: string
  createdAt: string
  author: { id: string; name?: string; email?: string }
}

export type OrderInboxPayload = {
  orderId: string
  messageId: string
  preview: string
}

export type OrderMessageReadPayload = {
  orderId: string
  readBy: 'customer' | 'admin'
  readAt: string
}

/**
 * Holds the /order-chat namespace server reference (set from OrderChatGateway.afterInit).
 * OrderMessagesService calls this only — avoids injecting the gateway into the service.
 */
@Injectable()
export class OrderChatBroadcastService {
  private readonly logger = new Logger(OrderChatBroadcastService.name)
  private server: Server | null = null

  setServer(server: Server): void {
    this.server = server
    this.logger.log('Order chat Socket.IO namespace ready')
  }

  emitNewMessage(orderId: string, payload: OrderMessageSocketPayload): void {
    if (!this.server) {
      this.logger.warn('Socket server not ready; skip message:new broadcast')
      return
    }
    this.server.to(`order:${orderId}`).emit('message:new', payload)
  }

  emitOrderMessageToCustomer(customerUserId: string, data: OrderInboxPayload): void {
    if (!this.server) return
    this.server.to(`user:${customerUserId}`).emit('order:message', data)
  }

  emitOrderMessageToAdmins(data: OrderInboxPayload): void {
    if (!this.server) return
    this.server.to('admin:inbox').emit('order:message', data)
  }

  emitMessageRead(
    orderId: string,
    payload: OrderMessageReadPayload,
    orderOwnerUserId: string,
  ): void {
    if (!this.server) return
    this.server.to(`order:${orderId}`).emit('message:read', payload)
    this.server.to(`user:${orderOwnerUserId}`).emit('message:read', payload)
    this.server.to('admin:inbox').emit('message:read', payload)
  }
}
