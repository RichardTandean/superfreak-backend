import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import { Order, OrderDocument } from './schemas/order.schema'
import { CreateOrderDto } from './dto/create-order.dto'
import { UpdateOrderDto } from './dto/update-order.dto'
import { InvoiceService } from './invoice.service'

const CANCELABLE_STATUSES = ['unpaid', 'in-review', 'needs-discussion']

function generateOrderNumber(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')
  return `ORD-${timestamp}-${random}`
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly invoiceService: InvoiceService,
  ) {}

  async list(userId: string, isAdmin: boolean) {
    const filter = isAdmin ? {} : { user: userId }
    const docs = await this.orderModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean()
      .exec()
    return docs.map((d: any) => ({ ...d, id: d._id.toString() }))
  }

  async findOne(id: string, userId: string, isAdmin: boolean): Promise<Record<string, unknown>> {
    const doc = await this.orderModel.findById(id).lean().exec()
    if (!doc) throw new NotFoundException('Order not found')
    if (!isAdmin && String(doc.user) !== userId) throw new ForbiddenException('Not your order')
    return { ...doc, id: (doc as any)._id.toString() } as Record<string, unknown>
  }

  async create(userId: string, dto: CreateOrderDto) {
    const orderNumber = generateOrderNumber()
    const doc = await this.orderModel.create({
      orderNumber,
      user: userId,
      status: 'unpaid',
      items: dto.items,
      summary: dto.summary,
      shipping: dto.shipping ?? {},
      paymentInfo: dto.paymentInfo ?? { paymentStatus: 'pending' },
      customerNotes: dto.customerNotes,
      statusHistory: [{ status: 'unpaid', changedAt: new Date() }],
    })
    return { ...doc.toObject(), id: doc._id.toString() }
  }

  async update(
    id: string,
    userId: string,
    isAdmin: boolean,
    dto: UpdateOrderDto,
  ): Promise<Record<string, unknown>> {
    const doc = await this.orderModel.findById(id).exec()
    if (!doc) throw new NotFoundException('Order not found')
    if (!isAdmin) throw new ForbiddenException('Only admin can update orders')

    if (dto.status !== undefined && dto.status !== doc.status) {
      const history = doc.statusHistory || []
      history.push({
        status: dto.status,
        changedAt: new Date(),
        changedBy: userId as any,
      })
      doc.statusHistory = history
      doc.status = dto.status
    }
    if (dto.adminNotes !== undefined) doc.adminNotes = dto.adminNotes
    if (dto.customerNotes !== undefined) doc.customerNotes = dto.customerNotes
    await doc.save()
    return { ...doc.toObject(), id: doc._id.toString() } as Record<string, unknown>
  }

  async remove(id: string, userId: string, isAdmin: boolean) {
    const doc = await this.orderModel.findById(id).exec()
    if (!doc) throw new NotFoundException('Order not found')
    if (!isAdmin) throw new ForbiddenException('Only admin can delete orders')
    await this.orderModel.findByIdAndDelete(id).exec()
    return { success: true, message: 'Order deleted' }
  }

  async cancel(id: string, userId: string): Promise<Record<string, unknown>> {
    const doc = await this.orderModel.findById(id).exec()
    if (!doc) throw new NotFoundException('Order not found')
    if (String(doc.user) !== userId) throw new ForbiddenException('Not your order')
    if (!CANCELABLE_STATUSES.includes(doc.status)) {
      throw new BadRequestException(
        `Order cannot be canceled. Only unpaid, in-review, or needs-discussion can be canceled. Current: ${doc.status}`,
      )
    }
    const history = doc.statusHistory || []
    history.push({ status: 'canceled', changedAt: new Date(), changedBy: userId as any })
    doc.status = 'canceled'
    doc.statusHistory = history
    await doc.save()
    return { ...doc.toObject(), id: doc._id.toString() } as Record<string, unknown>
  }

  async getInvoicePdf(id: string, userId: string): Promise<{ buffer: Buffer; orderNumber: string }> {
    const doc = await this.orderModel.findById(id).lean().exec()
    if (!doc) throw new NotFoundException('Order not found')
    if (String(doc.user) !== userId) throw new ForbiddenException('Not your order')
    const order = { ...doc, id: (doc as any)._id.toString() } as any
    const buffer = this.invoiceService.buildPdf(order)
    const orderNumber = doc.orderNumber ?? (doc as any)._id.toString()
    return { buffer, orderNumber }
  }
}
