import {
  BadRequestException,
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { UsersService } from './users.service'
import { UpdateMeDto } from './dto/update-me.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { UserDocument } from '../auth/schemas/user.schema'

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: UserDocument) {
    const result = await this.users.getMe(user._id.toString())
    if (!result) throw new BadRequestException('User not found')
    return result
  }

  @Patch('me')
  async updateMe(@CurrentUser() user: UserDocument, @Body() dto: UpdateMeDto) {
    const result = await this.users.updateMe(user._id.toString(), dto)
    if (!result) throw new BadRequestException('User not found')
    return result
  }

  @Post('profile-image')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadProfileImage(
    @CurrentUser() user: UserDocument,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided')
    }
    return this.users.setProfileImage(user._id.toString(), file)
  }
}
