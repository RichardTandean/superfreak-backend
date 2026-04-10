import { IoAdapter } from '@nestjs/platform-socket.io'
import { INestApplication } from '@nestjs/common'
import { ServerOptions } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'

/**
 * Socket.IO bound to the same HTTP server as Nest; Redis adapter for multi-instance fan-out.
 */
export class OrderChatIoAdapter extends IoAdapter {
  private adapterConstructor: ReturnType<typeof createAdapter> | null = null

  constructor(
    app: INestApplication,
    private readonly redisUrl: string,
    private readonly corsOrigin: string | string[],
  ) {
    super(app)
  }

  async connectToRedis(): Promise<void> {
    const pubClient = createClient({ url: this.redisUrl })
    const subClient = pubClient.duplicate()
    await Promise.all([pubClient.connect(), subClient.connect()])
    this.adapterConstructor = createAdapter(pubClient, subClient)
  }

  createIOServer(port: number, options?: ServerOptions): ReturnType<IoAdapter['createIOServer']> {
    const server = super.createIOServer(port, {
      ...options,
      cors: {
        origin: this.corsOrigin,
        credentials: true,
      },
    })
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor)
    }
    return server
  }
}
