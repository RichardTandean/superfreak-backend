import { Inject, Injectable } from '@nestjs/common'
import Redis from 'ioredis'
import { randomBytes } from 'crypto'
import { REDIS_CLIENT } from '../../config/redis.module'

const SESSION_PREFIX = 'session:'
const USER_SESSIONS_PREFIX = 'user_sessions:'
const SESSION_TTL = 3600 // 1 hour in seconds

export interface SessionData {
  userId: string
  role: string
  createdAt: number
}

@Injectable()
export class SessionService {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async createSession(userId: string, role: string): Promise<string> {
    const sessionId = randomBytes(32).toString('hex')
    const data: SessionData = {
      userId,
      role,
      createdAt: Date.now(),
    }

    const key = SESSION_PREFIX + sessionId
    await this.redis.set(key, JSON.stringify(data), 'EX', SESSION_TTL)

    // Track this session under the user so we can revoke all sessions later
    await this.redis.sadd(USER_SESSIONS_PREFIX + userId, sessionId)

    return sessionId
  }

  async getSession(sessionId: string): Promise<SessionData | null> {
    if (!sessionId) return null

    const key = SESSION_PREFIX + sessionId
    const raw = await this.redis.get(key)
    if (!raw) return null

    // Sliding window: extend TTL on every successful read
    await this.redis.expire(key, SESSION_TTL)

    try {
      return JSON.parse(raw) as SessionData
    } catch {
      return null
    }
  }

  async destroySession(sessionId: string): Promise<void> {
    if (!sessionId) return

    const key = SESSION_PREFIX + sessionId
    const raw = await this.redis.get(key)
    if (raw) {
      try {
        const data = JSON.parse(raw) as SessionData
        await this.redis.srem(USER_SESSIONS_PREFIX + data.userId, sessionId)
      } catch {}
    }

    await this.redis.del(key)
  }

  async destroyAllForUser(userId: string): Promise<void> {
    const setKey = USER_SESSIONS_PREFIX + userId
    const sessionIds = await this.redis.smembers(setKey)

    if (sessionIds.length > 0) {
      const keys = sessionIds.map((id) => SESSION_PREFIX + id)
      await this.redis.del(...keys)
    }

    await this.redis.del(setKey)
  }
}
