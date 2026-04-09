import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { PaymentsService } from './payments.service'
import { InitializePaymentDto } from './dto/initialize-payment.dto'
import { VerifyPaymentDto } from './dto/verify-payment.dto'
import { SessionGuard } from '../auth/guards/session.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UserDocument } from '../auth/schemas/user.schema'
import { MidtransWebhookDto } from './dto/midtrans-webhook.dto'

@Controller('payment')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('initialize')
  @UseGuards(SessionGuard)
  initialize(@CurrentUser() user: UserDocument, @Body() dto: InitializePaymentDto) {
    return this.payments.initialize(dto.orderId, user._id.toString(), dto.paymentMethod)
  }

  @Post('verify')
  @UseGuards(SessionGuard)
  verify(@CurrentUser() user: UserDocument, @Body() dto: VerifyPaymentDto) {
    return this.payments.verify(dto.orderId, user._id.toString())
  }

  @Post('webhooks/midtrans')
  async midtransWebhook(@Body() body: MidtransWebhookDto) {
    return this.payments.handleMidtransWebhook(body as unknown as Record<string, unknown>)
  }
}
