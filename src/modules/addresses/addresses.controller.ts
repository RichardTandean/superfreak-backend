import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common'
import { AddressesService } from './addresses.service'
import { CreateAddressDto } from './dto/create-address.dto'
import { UpdateAddressDto } from './dto/update-address.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UserDocument } from '../auth/schemas/user.schema'

@Controller('addresses')
@UseGuards(JwtAuthGuard)
export class AddressesController {
  constructor(private readonly addresses: AddressesService) {}

  @Get()
  list(@CurrentUser() user: UserDocument) {
    return this.addresses.findAllByUser(user._id.toString())
  }

  @Get(':id')
  getOne(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
  ): Promise<Record<string, unknown>> {
    return this.addresses.findOne(id, user._id.toString())
  }

  @Post()
  create(@CurrentUser() user: UserDocument, @Body() dto: CreateAddressDto) {
    return this.addresses.create(user._id.toString(), dto)
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @CurrentUser() user: UserDocument,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addresses.update(id, user._id.toString(), dto)
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: UserDocument) {
    return this.addresses.remove(id, user._id.toString())
  }
}
