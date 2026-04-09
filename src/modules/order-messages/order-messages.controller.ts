import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Res,
  Req,
} from '@nestjs/common'
import { Response, Request } from 'express'
import { SessionGuard } from '../auth/guards/session.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UserDocument } from '../auth/schemas/user.schema'
import { isAdminUser } from '../auth/utils/admin.util'
import { OrderMessagesService } from './order-messages.service'
import { CreateOrderMessageDto } from './dto/create-message.dto'
import { Inject } from '@nestjs/common'
import Redis from 'ioredis'
import { REDIS_CLIENT } from '../../config/redis.module'

@Controller('orders')
@UseGuards(SessionGuard)
export class OrderMessagesController {
  constructor(
    private readonly orderMessages: OrderMessagesService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  @Get(':id/messages')
  list(@Param('id') orderId: string, @CurrentUser() user: UserDocument) {
    return this.orderMessages.list(orderId, user._id.toString(), isAdminUser(user))
  }

  @Post(':id/messages')
  create(
    @Param('id') orderId: string,
    @CurrentUser() user: UserDocument,
    @Body() dto: CreateOrderMessageDto,
  ): Promise<Record<string, unknown>> {
    return this.orderMessages.create(orderId, user._id.toString(), isAdminUser(user), dto)
  }

  @Get(':id/messages/stream')
  stream(
    @Param('id') orderId: string,
    @CurrentUser() user: UserDocument,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = user._id.toString()

    this.orderMessages
      .checkOrderAccess(orderId, userId, isAdminUser(user))
      .then((order) => {
        if (!order) {
          res.status(404).json({ error: 'Order not found' })
          return
        }

        const channel = this.orderMessages.getChannelName(orderId)
        const subscriber = this.redis.duplicate()

        res.setHeader('Content-Type', 'text/event-stream')
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
        res.setHeader('Connection', 'keep-alive')
        res.flushHeaders()

        const send = (data: object) => {
          try {
            res.write(`data: ${JSON.stringify(data)}\n\n`)
          } catch {
            // client may have disconnected
          }
        }

        subscriber.subscribe(channel, (err) => {
          if (err) {
            send({ error: 'Subscribe failed' })
            res.end()
            subscriber.quit().catch(() => {})
            return
          }
        })

        subscriber.on('message', (_ch: string, message: string) => {
          try {
            const data = JSON.parse(message)
            send(data)
          } catch {
            send({ raw: message })
          }
        })

        req.on('close', () => {
          subscriber.unsubscribe(channel)
          subscriber.quit().catch(() => {})
          try {
            res.end()
          } catch {}
        })
      })
      .catch(() => {
        res.status(500).json({ error: 'Failed to start stream' })
      })
  }
}
