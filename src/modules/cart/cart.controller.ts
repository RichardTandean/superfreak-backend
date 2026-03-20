import { Controller, Get, Post, Delete, Body, UseGuards } from '@nestjs/common'
import { CartService } from './cart.service'
import { SetCartDto } from './dto/set-cart.dto'
import { SessionGuard } from '../auth/guards/session.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UserDocument } from '../auth/schemas/user.schema'

@Controller('cart')
@UseGuards(SessionGuard)
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  getCart(@CurrentUser() user: UserDocument) {
    return this.cart.getCart(user._id.toString())
  }

  @Post()
  setCart(@CurrentUser() user: UserDocument, @Body() dto: SetCartDto) {
    return this.cart.setCart(user._id.toString(), dto.items)
  }

  @Delete()
  clearCart(@CurrentUser() user: UserDocument) {
    return this.cart.clearCart(user._id.toString())
  }
}
