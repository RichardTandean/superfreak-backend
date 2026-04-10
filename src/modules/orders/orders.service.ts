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
import { PrintingService } from '../printing/printing.service'
import {
  OrderChatReadService,
  orderOwnerUserId,
} from '../order-messages/order-chat-read.service'

const CANCELABLE_STATUSES = ['unpaid', 'in-review', 'needs-discussion']

function generateOrderNumber(): string {
  const timestamp = Date.now()
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')
  return `ORD-${timestamp}-${random}`
}

function normalizeIncomingOrderItems(items: unknown[]): Record<string, unknown>[] {
  if (!items.length) {
    throw new BadRequestException('Order must contain at least one item')
  }
  return items.map((raw, index) => {
    const candidate =
      Array.isArray(raw) && raw.length > 0 && typeof raw[0] === 'object'
        ? raw[0]
        : raw

    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new BadRequestException(`Invalid order item at index ${index}: not a valid object`)
    }

    const obj = candidate as Record<string, unknown>
    if (!obj.fileName && !obj.file) {
      throw new BadRequestException(
        `Invalid order item at index ${index}: missing fileName or file reference`,
      )
    }

    return obj
  })
}

function toSafeNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/[^\d.-]/g, ''))
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function roundCurrency(value: number): number {
  return Math.max(0, Math.round(value))
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly printing: PrintingService,
    private readonly invoiceService: InvoiceService,
    private readonly orderChatRead: OrderChatReadService,
  ) {}

  private async buildTrustedOrderPricing(normalizedItems: Record<string, unknown>[], shipping: Record<string, unknown>) {
    let subtotal = 0
    let totalWeight = 0
    let totalPrintTime = 0

    const trustedItems = await Promise.all(
      normalizedItems.map(async (item, index) => {
        const config =
          item.configuration && typeof item.configuration === 'object'
            ? (item.configuration as Record<string, unknown>)
            : {}
        const statistics =
          item.statistics && typeof item.statistics === 'object'
            ? (item.statistics as Record<string, unknown>)
            : {}

        const material = String(config.material ?? '').trim()
        const filamentVariantId = String(
          (config as Record<string, unknown>).filamentVariantId ?? '',
        ).trim()
        const layerHeight = toSafeNumber(config.layerHeight)
        const quantityRaw = toSafeNumber(item.quantity)
        const quantity = Math.max(1, Math.min(100, Math.trunc(quantityRaw || 1)))
        const filamentWeightPerUnit =
          toSafeNumber(statistics.filamentWeight) || toSafeNumber(statistics.filament_weight_g)
        const printTimeMinutesPerUnit =
          toSafeNumber(statistics.printTime) || toSafeNumber(statistics.print_time_minutes)

        if (!material) {
          throw new BadRequestException(`Order item at index ${index} is missing material`)
        }
        if (!filamentVariantId) {
          throw new BadRequestException(`Order item at index ${index} is missing filamentVariantId`)
        }
        if (layerHeight <= 0) {
          throw new BadRequestException(`Order item at index ${index} has invalid layerHeight`)
        }
        if (filamentWeightPerUnit <= 0) {
          throw new BadRequestException(`Order item at index ${index} has invalid filament weight`)
        }

        const pricePerGram = await this.printing.resolvePricePerGramForVariant(
          filamentVariantId,
          layerHeight,
        )
        const totalItemWeight = filamentWeightPerUnit * quantity
        const totalItemPrice = roundCurrency(totalItemWeight * pricePerGram)
        const totalItemPrintTime = printTimeMinutesPerUnit * quantity

        subtotal += totalItemPrice
        totalWeight += totalItemWeight
        totalPrintTime += totalItemPrintTime

        return {
          ...item,
          quantity,
          statistics: {
            ...statistics,
            filamentWeight: filamentWeightPerUnit,
            printTime: printTimeMinutesPerUnit,
          },
          pricing: {
            pricePerGram,
          },
          totalPrice: totalItemPrice,
        }
      }),
    )

    const shippingCost = Math.max(0, roundCurrency(toSafeNumber(shipping.shippingCost)))
    const totalAmount = subtotal + shippingCost

    return {
      trustedItems,
      summary: {
        subtotal,
        shippingCost,
        totalAmount,
        payableAmount: totalAmount,
        totalWeight,
        totalPrintTime,
      },
    }
  }

  async list(userId: string, isAdmin: boolean) {
    const filter = isAdmin ? {} : { user: userId }
    let q = this.orderModel.find(filter).sort({ createdAt: -1 }).limit(100)
    if (isAdmin) {
      q = q.populate('user', 'email name')
    }
    const docs = await q.lean().exec()
    const rows = docs.map((d: any) => ({ ...d, id: d._id.toString() }))
    return this.orderChatRead.enrichOrdersWithDiscussionUnread(rows, userId, isAdmin)
  }

  async findOne(id: string, userId: string, isAdmin: boolean): Promise<Record<string, unknown>> {
    let q = this.orderModel.findById(id)
    if (isAdmin) {
      q = q.populate('user', 'email name')
    }
    const doc = await q.lean().exec()
    if (!doc) throw new NotFoundException('Order not found')
    if (!isAdmin && String(doc.user) !== userId) throw new ForbiddenException('Not your order')
    const base = { ...doc, id: (doc as any)._id.toString() } as Record<string, unknown>
    if (doc.status === 'needs-discussion') {
      base.discussionUnreadCount = await this.orderChatRead.getUnreadCount(
        id,
        userId,
        isAdmin,
        orderOwnerUserId(doc.user),
      )
    } else {
      base.discussionUnreadCount = 0
    }
    return base
  }

  async create(userId: string, dto: CreateOrderDto) {
    const orderNumber = generateOrderNumber()
    const normalizedItems = normalizeIncomingOrderItems(dto.items)
    const shipping =
      dto.shipping && typeof dto.shipping === 'object'
        ? (dto.shipping as unknown as Record<string, unknown>)
        : {}
    const trustedPricing = await this.buildTrustedOrderPricing(normalizedItems, shipping)
    const doc = await this.orderModel.create({
      orderNumber,
      user: userId,
      status: 'unpaid',
      items: trustedPricing.trustedItems,
      summary: trustedPricing.summary,
      shipping,
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
