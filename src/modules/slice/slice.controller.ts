import {
  Controller,
  Post,
  Req,
  BadRequestException,
  HttpException,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Request } from 'express'
import { SliceService } from './slice.service'
import { SessionGuard } from '../auth/guards/session.guard'
import { Throttle } from '@nestjs/throttler'

const MAX_SLICE_UPLOAD_MB = 100
const MAX_SLICE_UPLOAD_BYTES = MAX_SLICE_UPLOAD_MB * 1024 * 1024

@Controller('slice')
export class SliceController {
  constructor(private readonly sliceService: SliceService) {}

  @Post()
  @UseGuards(SessionGuard)
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_SLICE_UPLOAD_BYTES } }))
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
    const mod = await import('form-data')
    // `form-data` can be exported differently depending on bundler/runtime.
    // Handle both `default` export and direct module export to ensure we get a constructor.
    const FormDataCtor = (mod as any).default ?? (mod as any)
    const form = new FormDataCtor()
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
