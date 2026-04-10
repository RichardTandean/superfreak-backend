import { NestFactory, HttpAdapterHost } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import * as cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import { AllExceptionsFilter } from './filters/all-exceptions.filter'
import { OrderChatIoAdapter } from './realtime/order-chat-io.adapter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  app.use(cookieParser())
  const corsOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000'
  const origins = corsOrigin.split(',').map((o) => o.trim()).filter(Boolean)
  const corsValue = origins.length > 0 ? origins : ['http://localhost:3000']
  app.enableCors({
    origin: corsValue,
    credentials: true,
  })

  const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379'
  const redisIoAdapter = new OrderChatIoAdapter(app, redisUrl, corsValue)
  await redisIoAdapter.connectToRedis()
  app.useWebSocketAdapter(redisIoAdapter)
  app.setGlobalPrefix('api', { exclude: ['health'] })
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  const httpAdapterHost = app.get(HttpAdapterHost)
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost))

  const port = process.env.PORT ?? 4000
  await app.listen(port)
  console.log(`Superfreak API running at http://localhost:${port}`)
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err)
  process.exit(1)
})
