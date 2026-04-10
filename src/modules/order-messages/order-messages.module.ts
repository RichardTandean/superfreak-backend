import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Order, OrderSchema } from '../orders/schemas/order.schema'
import { OrderMessage, OrderMessageSchema } from './schemas/order-message.schema'
import {
  OrderChatReadState,
  OrderChatReadStateSchema,
} from './schemas/order-chat-read-state.schema'
import { OrderMessagesService } from './order-messages.service'
import { OrderMessagesController } from './order-messages.controller'
import { OrderChatGateway } from './order-chat.gateway'
import { OrderChatBroadcastService } from './order-chat-broadcast.service'
import { OrderChatReadService } from './order-chat-read.service'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: OrderMessage.name, schema: OrderMessageSchema },
      { name: OrderChatReadState.name, schema: OrderChatReadStateSchema },
    ]),
    AuthModule,
  ],
  controllers: [OrderMessagesController],
  providers: [OrderMessagesService, OrderChatBroadcastService, OrderChatGateway, OrderChatReadService],
  exports: [OrderMessagesService, OrderChatBroadcastService, OrderChatReadService],
})
export class OrderMessagesModule {}
