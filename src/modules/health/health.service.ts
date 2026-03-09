import { Injectable } from '@nestjs/common'
import { InjectConnection } from '@nestjs/mongoose'
import { Connection } from 'mongoose'
import { Inject } from '@nestjs/common'
import Redis from 'ioredis'
import { REDIS_CLIENT } from '../../config/redis.module'

export interface HealthResult {
  status: 'ok' | 'degraded' | 'error'
  mongodb: 'up' | 'down'
  redis: 'up' | 'down'
  timestamp: string
}

@Injectable()
export class HealthService {
  constructor(
    @InjectConnection() private readonly mongo: Connection,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async check(): Promise<HealthResult> {
    const mongodb = (await this.pingMongo()) ? 'up' : 'down'
    const redis = (await this.pingRedis()) ? 'up' : 'down'
    const status = mongodb === 'up' && redis === 'up' ? 'ok' : mongodb === 'down' && redis === 'down' ? 'error' : 'degraded'

    return {
      status,
      mongodb,
      redis,
      timestamp: new Date().toISOString(),
    }
  }

  private async pingMongo(): Promise<boolean> {
    try {
      const state = this.mongo.readyState
      if (state !== 1 || !this.mongo.db) return false
      await this.mongo.db.admin().ping()
      return true
    } catch {
      return false
    }
  }

  private async pingRedis(): Promise<boolean> {
    try {
      const res = await this.redis.ping()
      return res === 'PONG'
    } catch {
      return false
    }
  }
}
