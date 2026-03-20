import { Controller, Post, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { MediaService } from './media.service'
import { SessionGuard } from '../auth/guards/session.guard'

@Controller('media')
export class MediaController {
  constructor(private readonly media: MediaService) {}

  /**
   * Generic upload: multipart file → R2, returns { url, key }.
   * Authenticated users only.
   */
  @Post()
  @UseGuards(SessionGuard)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async upload(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided')
    return this.media.upload(file)
  }
}
