import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Res,
} from '@nestjs/common'
import { Response } from 'express'
import { OrdersService } from './orders.service'
import { CreateOrderDto } from './dto/create-order.dto'
import { UpdateOrderDto } from './dto/update-order.dto'
import { SessionGuard } from '../auth/guards/session.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UserDocument } from '../auth/schemas/user.schema'
import { isAdminUser } from '../auth/utils/admin.util'

@Controller('orders')
@UseGuards(SessionGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@CurrentUser() user: UserDocument) {
    return this.orders.list(user._id.toString(), isAdminUser(user))
  }

  @Post()
  create(@CurrentUser() user: UserDocument, @Body() dto: CreateOrderDto) {
    return this.orders.create(user._id.toString(), dto)
  }

  @Get(':id')
  getOne(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ): Promise<Record<string, unknown>> {
    return this.orders.findOne(id, user._id.toString(), isAdminUser(user))
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Body() dto: UpdateOrderDto,
  ): Promise<Record<string, unknown>> {
    return this.orders.update(id, user._id.toString(), true, dto)
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  remove(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    return this.orders.remove(id, user._id.toString(), true)
  }

  @Post(':id/cancel')
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ): Promise<Record<string, unknown>> {
    return this.orders.cancel(id, user._id.toString())
  }

  @Get(':id/invoice')
  async getInvoice(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Res() res: Response,
  ) {
    const { buffer, orderNumber } = await this.orders.getInvoicePdf(id, user._id.toString())
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="invoice-${orderNumber}.pdf"`,
      'Content-Length': String(buffer.length),
    })
    res.send(buffer)
  }
}
