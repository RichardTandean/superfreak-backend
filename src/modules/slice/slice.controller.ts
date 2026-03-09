import {
  Controller,
  Post,
  Req,
  BadRequestException,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Request } from 'express'
import { SliceService } from './slice.service'

@Controller('slice')
export class SliceController {
  constructor(private readonly sliceService: SliceService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 500 * 1024 * 1024 } }))
  async proxy(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    if (!file) {
      throw new BadRequestException({ detail: 'No file provided' })
    }

    const formData = await this.buildFormData(file, req.body)
    try {
      const result = await this.sliceService.slice(formData)
      if (result.status >= 400) {
        throw new HttpException(
          result.data?.detail ?? result.data ?? 'Slice failed',
          result.status as HttpStatus,
        )
      }
      return result.data
    } catch (e) {
      if (e instanceof HttpException) throw e
      const message = e instanceof Error ? e.message : 'Unknown error'
      throw new HttpException(
        { detail: `Slice service error: ${message}` },
        HttpStatus.BAD_GATEWAY,
      )
    }
  }

  private async buildFormData(
    file: Express.Multer.File,
    body: Record<string, any>,
  ): Promise<{ getHeaders: () => Record<string, string> }> {
    const FormData = (await import('form-data')).default
    const form = new FormData()
    const buffer = file.buffer ?? (file as any).buffer
    form.append('file', Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer), {
      filename: file.originalname || 'model.stl',
      contentType: file.mimetype || 'application/octet-stream',
    })
    if (body && typeof body === 'object') {
      for (const [key, value] of Object.entries(body)) {
        if (value !== undefined && value !== null) {
          form.append(key, String(value))
        }
      }
    }
    return form
  }
}
