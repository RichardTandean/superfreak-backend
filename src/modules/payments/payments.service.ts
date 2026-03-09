import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectModel } from '@nestjs/mongoose'
import { Model } from 'mongoose'
import Midtrans, { Snap, CoreApi } from 'midtrans-client'
import { Order, OrderDocument } from '../orders/schemas/order.schema'
import { User, UserDocument } from '../auth/schemas/user.schema'

type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded'

const ENABLED_PAYMENTS_MAP: Record<string, string[]> = {
  bank_transfer: ['other_va', 'bca_va', 'bni_va', 'bri_va', 'permata_va'],
  credit_card: ['credit_card'],
  e_wallet: ['gopay', 'shopeepay', 'qris'],
}

function mapPaymentMethod(midtransType: string): 'bank_transfer' | 'credit_card' | 'e_wallet' | undefined {
  if (midtransType === 'credit_card' || midtransType === 'debit_card') return 'credit_card'
  if (
    ['bank_transfer', 'echannel', 'bca_va', 'bni_va', 'permata_va', 'other_va'].includes(midtransType)
  )
    return 'bank_transfer'
  if (['gopay', 'shopeepay', 'qris'].includes(midtransType)) return 'e_wallet'
  return undefined
}

function mapTransactionStatus(
  transactionStatus: string,
  fraudStatus?: string,
): { paymentStatus: PaymentStatus; orderStatus: string } {
  let paymentStatus: PaymentStatus = 'pending'
  let orderStatus = 'unpaid'

  if (transactionStatus === 'capture') {
    if (fraudStatus === 'accept') {
      paymentStatus = 'paid'
      orderStatus = 'in-review'
    }
  } else if (transactionStatus === 'settlement') {
    paymentStatus = 'paid'
    orderStatus = 'in-review'
  } else if (['cancel', 'deny', 'expire'].includes(transactionStatus)) {
    paymentStatus = 'failed'
    orderStatus = 'canceled'
  } else if (transactionStatus === 'pending') {
    paymentStatus = 'pending'
  } else if (transactionStatus === 'refund') {
    paymentStatus = 'refunded'
  }

  return { paymentStatus, orderStatus }
}

@Injectable()
export class PaymentsService {
  private readonly snap: Snap
  private readonly core: CoreApi

  constructor(
    private readonly config: ConfigService,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {
    const isProduction = this.config.get<string>('MIDTRANS_IS_PRODUCTION', 'false') === 'true'
    const serverKey = this.config.get<string>('MIDTRANS_SERVER_KEY', '')
    const clientKey = this.config.get<string>('MIDTRANS_CLIENT_KEY', '')
    this.snap = new Midtrans.Snap({ isProduction, serverKey, clientKey })
    this.core = new Midtrans.CoreApi({ isProduction, serverKey, clientKey })
  }

  async initialize(orderId: string, userId: string, paymentMethod?: string) {
    const order = await this.orderModel.findById(orderId).lean().exec()
    if (!order) throw new NotFoundException('Order not found')
    if (String(order.user) !== userId) throw new ForbiddenException('Not your order')

    const shipping = order.shipping as Record<string, unknown> | undefined
    if (!shipping?.recipientName || !shipping?.phoneNumber) {
      throw new BadRequestException('Order shipping information is missing')
    }

    const user = await this.userModel.findById(order.user).exec()
    if (!user) throw new BadRequestException('Order user information is missing')

    const midtransOrderId = `${order.orderNumber}-T${Date.now()}`
    const grossAmount = Math.round((order.summary as any)?.totalAmount ?? 0)

    const parameter: Record<string, unknown> = {
      transaction_details: {
        order_id: midtransOrderId,
        gross_amount: grossAmount,
      },
      customer_details: {
        first_name: String(shipping.recipientName),
        email: user.email,
        phone: String(shipping.phoneNumber),
      },
    }
    if (paymentMethod && ENABLED_PAYMENTS_MAP[paymentMethod]) {
      (parameter as any).enabled_payments = ENABLED_PAYMENTS_MAP[paymentMethod]
    }

    const transaction = await this.snap.createTransaction(parameter as any)

    const paymentExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const paymentInfo = {
      ...(order.paymentInfo as object),
      paymentMethod: paymentMethod ?? (order.paymentInfo as any)?.paymentMethod,
      midtransOrderId,
      midtransSnapToken: transaction.token,
      midtransSnapUrl: transaction.redirect_url,
      paymentExpiry,
    }

    await this.orderModel
      .updateOne(
        { _id: orderId },
        { $set: { paymentInfo } },
      )
      .exec()

    return {
      success: true,
      snapToken: transaction.token,
      snapUrl: transaction.redirect_url,
      orderId: order._id.toString(),
    }
  }

  async verify(orderId: string, userId: string) {
    const order = await this.orderModel.findById(orderId).lean().exec()
    if (!order) throw new NotFoundException('Order not found')
    if (String(order.user) !== userId) throw new ForbiddenException('Not your order')

    const midtransOrderId = (order.paymentInfo as any)?.midtransOrderId ?? order.orderNumber
    const transactionStatus = await this.core.transaction.status(midtransOrderId)

    const { paymentStatus, orderStatus } = mapTransactionStatus(
      transactionStatus.transaction_status,
      transactionStatus.fraud_status,
    )

    const paymentMethod = mapPaymentMethod(transactionStatus.payment_type || '')
    const currentPaymentStatus = (order.paymentInfo as any)?.paymentStatus
    const currentOrderStatus = order.status

    if (paymentStatus !== currentPaymentStatus || orderStatus !== currentOrderStatus) {
      const update: any = {
        status: orderStatus,
        paymentInfo: {
          ...(order.paymentInfo as object),
          paymentStatus,
          transactionId: transactionStatus.transaction_id,
          paidAt: paymentStatus === 'paid' ? new Date().toISOString() : (order.paymentInfo as any)?.paidAt,
        },
      }
      if (paymentMethod) update.paymentInfo.paymentMethod = paymentMethod

      await this.orderModel.updateOne({ _id: orderId }, { $set: update }).exec()
    }

    return {
      success: true,
      orderId,
      orderNumber: order.orderNumber,
      paymentStatus,
      orderStatus,
      transactionStatus: transactionStatus.transaction_status,
    }
  }

  async handleMidtransWebhook(notification: Record<string, unknown>) {
    const transactionStatus = await this.core.transaction.notification(notification)
    const midtransOrderId = transactionStatus.order_id

    const order = await this.orderModel
      .findOne({ 'paymentInfo.midtransOrderId': midtransOrderId })
      .lean()
      .exec()

    if (!order) {
      throw new NotFoundException('Order not found')
    }

    const { paymentStatus, orderStatus } = mapTransactionStatus(
      transactionStatus.transaction_status,
      transactionStatus.fraud_status,
    )

    const paymentMethod = mapPaymentMethod(transactionStatus.payment_type || '')
    const update: any = {
      status: orderStatus,
      paymentInfo: {
        ...(order.paymentInfo as object),
        paymentStatus,
        transactionId: transactionStatus.transaction_id,
        paidAt: paymentStatus === 'paid' ? new Date().toISOString() : (order.paymentInfo as any)?.paidAt,
      },
    }
    if (paymentMethod) update.paymentInfo.paymentMethod = paymentMethod

    await this.orderModel
      .updateOne({ _id: order._id }, { $set: update })
      .exec()

    return {
      success: true,
      orderId: midtransOrderId,
      paymentStatus,
      orderStatus,
    }
  }
}
