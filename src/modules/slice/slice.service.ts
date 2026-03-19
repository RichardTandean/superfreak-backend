import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class SliceService {
  private readonly baseUrl: string

  constructor(private readonly config: ConfigService) {
    this.baseUrl =
      this.config.get<string>('SUPERSLICE_API_URL') ||
      this.config.get<string>('NEXT_PUBLIC_SUPERSLICE_API_URL') ||
      'http://localhost:8000'
  }

  /**
   * Proxy multipart request to SuperSlice /slice endpoint.
   * formData is from the 'form-data' package (stream + getHeaders()).
   */
  async slice(formData: any): Promise<{
    status: number
    data: any
    contentType: string | null
  }> {
    const headers = formData.getHeaders()
    const body = formData.getBuffer()

    const response = await fetch(`${this.baseUrl}/slice`, {
      method: 'POST',
      body,
      headers,
    })

    const contentType = response.headers.get('content-type')
    const isJson = contentType?.includes('application/json')

    if (isJson) {
      const data = await response.json().catch(() => ({}))
      return { status: response.status, data, contentType }
    }
    const text = await response.text()
    return { status: response.status, data: text, contentType: contentType || 'text/plain' }
  }
}
