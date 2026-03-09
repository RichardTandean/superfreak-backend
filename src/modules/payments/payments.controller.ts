import { Body, Controller, Post, UseGuards } from '@nestjs/common'
import { PaymentsService } from './payments.service'
import { InitializePaymentDto } from './dto/initialize-payment.dto'
import { VerifyPaymentDto } from './dto/verify-payment.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UserDocument } from '../auth/schemas/user.schema'

@Controller('payment')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  initialize(@CurrentUser() user: UserDocument, @Body() dto: InitializePaymentDto) {
    return this.payments.initialize(dto.orderId, user._id.toString(), dto.paymentMethod)
  }

  @Post('verify')
  @UseGuards(JwtAuthGuard)
  verify(@CurrentUser() user: UserDocument, @Body() dto: VerifyPaymentDto) {
    return this.payments.verify(dto.orderId, user._id.toString())
  }

  @Post('webhooks/midtrans')
  async midtransWebhook(@Body() body: Record<string, unknown>) {
    return this.payments.handleMidtransWebhook(body)
  }
}
