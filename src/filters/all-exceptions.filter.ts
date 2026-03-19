import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common'
import { HttpAdapterHost } from '@nestjs/core'

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const { httpAdapter } = this.httpAdapterHost
    const ctx = host.switchToHttp()
    const request = ctx.getRequest<Request & { originalUrl?: string }>()
    const response = ctx.getResponse()

    const isHttpException = exception instanceof HttpException
    const statusCode = isHttpException ? exception.getStatus() : 500
    const responseBody = isHttpException
      ? exception.getResponse()
      : { statusCode, message: 'Internal server error' }

    const method = (request as any)?.method
    const url = (request as any)?.originalUrl ?? (request as any)?.url
    const contentType = (request as any)?.headers?.['content-type']

    // This is intentionally verbose: we need the actual root-cause for body parsing issues.
    // Nest often responds with a generic 400 without logging the underlying parser error.
    console.error('[HTTP Exception]', {
      method,
      url,
      contentType,
      statusCode,
      responseBody,
      exceptionName:
        typeof exception === 'object' && exception && 'name' in exception
          ? (exception as any).name
          : undefined,
      exceptionMessage:
        exception instanceof Error ? exception.message : String(exception),
      stack: exception instanceof Error ? exception.stack : undefined,
    })

    httpAdapter.reply(response, responseBody as any, statusCode)
  }
}

