import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

@Injectable()
export class R2Service {
  private readonly client: S3Client
  private readonly bucket: string
  private readonly publicUrl: string

  constructor(private readonly config: ConfigService) {
    const accountId = this.config.get<string>('R2_ACCOUNT_ID')
    const accessKeyId = this.config.get<string>('R2_ACCESS_KEY_ID')
    const secretAccessKey = this.config.get<string>('R2_SECRET_ACCESS_KEY')
    this.bucket = this.config.get<string>('R2_BUCKET_NAME', '')
    this.publicUrl = this.config.get<string>('R2_PUBLIC_URL', '').replace(/\/$/, '')

    this.client = new S3Client({
      region: 'auto',
      endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined,
      credentials:
        accessKeyId && secretAccessKey
          ? { accessKeyId, secretAccessKey }
          : undefined,
    })
  }

  /**
   * Upload a buffer to R2 and return the public URL.
   * @param key - Object key (e.g. "profile/userId/abc.jpg")
   * @param body - File buffer
   * @param contentType - MIME type
   */
  async upload(key: string, body: Buffer, contentType: string): Promise<string> {
    if (!this.bucket) {
      throw new Error('R2_BUCKET_NAME is not configured')
    }
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    )
    if (this.publicUrl) {
      return `${this.publicUrl}/${key}`
    }
    return key
  }

  async getBuffer(key: string): Promise<Buffer> {
    if (!this.bucket) throw new Error('R2_BUCKET_NAME is not configured')
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    )
    const chunks: Uint8Array[] = []
    const body = response.Body
    if (!body) throw new Error('Empty response from R2')
    for await (const chunk of body as any) {
      chunks.push(chunk)
    }
    return Buffer.concat(chunks)
  }

  async delete(key: string): Promise<void> {
    if (!this.bucket) throw new Error('R2_BUCKET_NAME is not configured')
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }

  /** If the URL is our R2 public URL, return the object key; otherwise null. */
  getKeyFromPublicUrl(fullUrl: string): string | null {
    if (!fullUrl || !this.publicUrl) return null
    const prefix = this.publicUrl.endsWith('/') ? this.publicUrl : `${this.publicUrl}/`
    return fullUrl.startsWith(prefix) ? fullUrl.slice(prefix.length) : null
  }
}
