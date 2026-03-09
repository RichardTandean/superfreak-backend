import { Injectable } from '@nestjs/common'
import { R2Service } from '../../shared/r2.service'

@Injectable()
export class MediaService {
  constructor(private readonly r2: R2Service) {}

  /**
   * Upload a file to R2 under media/ prefix and return its public URL.
   */
  async upload(file: Express.Multer.File): Promise<{ url: string; key: string }> {
    const buffer = file.buffer ?? (file as any).buffer
    const body = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
    const ext = (file.originalname || 'file').split('.').pop()?.toLowerCase() || 'bin'
    const key = `media/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`
    const contentType = file.mimetype || 'application/octet-stream'
    const url = await this.r2.upload(key, body, contentType)
    return { url, key }
  }
}
