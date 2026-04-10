import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common'
import { SessionGuard } from '../auth/guards/session.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UserDocument } from '../auth/schemas/user.schema'
import { isAdminUser } from '../auth/utils/admin.util'
import { OrderMessagesService } from './order-messages.service'
import { OrderChatReadService } from './order-chat-read.service'
import { CreateOrderMessageDto } from './dto/create-message.dto'

@Controller('orders')
@UseGuards(SessionGuard)
export class OrderMessagesController {
  constructor(
    private readonly orderMessages: OrderMessagesService,
    private readonly orderChatRead: OrderChatReadService,
  ) {}

  @Get(':id/messages')
  list(@Param('id') orderId: string, @CurrentUser() user: UserDocument) {
    return this.orderMessages.list(orderId, user._id.toString(), isAdminUser(user))
  }

  @Post(':id/messages/read')
  markMessagesRead(@Param('id') orderId: string, @CurrentUser() user: UserDocument) {
    return this.orderChatRead.markRead(orderId, user._id.toString(), isAdminUser(user))
  }

  @Post(':id/messages')
  create(
    @Param('id') orderId: string,
    @CurrentUser() user: UserDocument,
    @Body() dto: CreateOrderMessageDto,
  ): Promise<Record<string, unknown>> {
    return this.orderMessages.create(orderId, user._id.toString(), isAdminUser(user), dto)
  }
}
