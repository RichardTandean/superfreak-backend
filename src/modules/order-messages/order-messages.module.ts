import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Order, OrderSchema } from '../orders/schemas/order.schema'
import { OrderMessage, OrderMessageSchema } from './schemas/order-message.schema'
import { OrderMessagesService } from './order-messages.service'
import { OrderMessagesController } from './order-messages.controller'
import { AuthModule } from '../auth/auth.module'

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: OrderMessage.name, schema: OrderMessageSchema },
    ]),
    AuthModule,
  ],
  controllers: [OrderMessagesController],
  providers: [OrderMessagesService],
  exports: [OrderMessagesService],
})
export class OrderMessagesModule {}
