import { Injectable, Inject } from '@nestjs/common'
import Redis from 'ioredis'
import { REDIS_CLIENT } from '../../config/redis.module'

const WILAYAH_BASE = 'https://wilayah.id/api'
const WILAYAH_CACHE_TTL = 2592000 // 30 days
const VALID_TYPES = ['provinces', 'regencies', 'districts', 'villages'] as const

@Injectable()
export class WilayahService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async getProvinces(): Promise<any> {
    const cacheKey = 'wilayah:provinces'
    const cached = await this.redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const response = await fetch(`${WILAYAH_BASE}/provinces.json`, {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch provinces: ${response.status}`)
    }
    const result = await response.json()
    const data = result.data ?? result
    await this.redis.setex(cacheKey, WILAYAH_CACHE_TTL, JSON.stringify(data))
    return data
  }

  async getByTypeAndCode(type: string, code: string): Promise<any> {
    if (!VALID_TYPES.includes(type as any) || type === 'provinces') {
      throw new Error(`Invalid type. Must be one of: regencies, districts, villages`)
    }

    const cacheKey = `wilayah:${type}:${code}`
    const cached = await this.redis.get(cacheKey)
    if (cached) return JSON.parse(cached)

    const response = await fetch(`${WILAYAH_BASE}/${type}/${code}.json`, {
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) {
      throw new Error(`Failed to fetch ${type}: ${response.status}`)
    }
    const result = await response.json()
    const data = result.data ?? result
    await this.redis.setex(cacheKey, WILAYAH_CACHE_TTL, JSON.stringify(data))
    return data
  }
}
