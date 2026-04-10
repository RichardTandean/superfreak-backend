import { Module } from '@nestjs/common'
import { MongooseModule } from '@nestjs/mongoose'
import { Order, OrderSchema } from './schemas/order.schema'
import { OrdersService } from './orders.service'
import { OrdersController } from './orders.controller'
import { InvoiceService } from './invoice.service'
import { AuthModule } from '../auth/auth.module'
import { PrintingModule } from '../printing/printing.module'
import { OrderMessagesModule } from '../order-messages/order-messages.module'

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    AuthModule,
    PrintingModule,
    OrderMessagesModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService, InvoiceService],
  exports: [OrdersService],
})
export class OrdersModule {}
