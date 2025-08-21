import { Redis } from "@upstash/redis"

// For local development, we'll use mock Redis if not configured
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379"
const REDIS_TOKEN = process.env.REDIS_TOKEN || "local-dev-token"

// Mock Redis for local development without Upstash
class MockRedis {
  private store: Map<string, any> = new Map()
  
  async get(key: string) {
    return this.store.get(key) || null
  }
  
  async set(key: string, value: any, ...args: any[]) {
    this.store.set(key, value)
    return "OK"
  }
  
  async setex(key: string, seconds: number, value: any) {
    this.store.set(key, value)
    // In a real implementation, we'd handle expiration
    return "OK"
  }
  
  async del(...keys: string[]) {
    keys.forEach(key => this.store.delete(key))
    return keys.length
  }
  
  async incr(key: string) {
    const current = this.store.get(key) || 0
    const newVal = current + 1
    this.store.set(key, newVal)
    return newVal
  }
  
  async expire(key: string, seconds: number) {
    // In a real implementation, we'd handle expiration
    return 1
  }
  
  async keys(pattern: string) {
    // Simple pattern matching for development
    return Array.from(this.store.keys()).filter(key => 
      key.includes(pattern.replace('*', ''))
    )
  }
  
  async llen(key: string) {
    return 0
  }
  
  async lpush(key: string, ...values: any[]) {
    return values.length
  }
  
  async rpoplpush(source: string, destination: string) {
    return null
  }
  
  async lrem(key: string, count: number, value: any) {
    return 0
  }
  
  async ltrim(key: string, start: number, stop: number) {
    return "OK"
  }
  
  async zadd(key: string, ...args: any[]) {
    return 1
  }
  
  async zrangebyscore(key: string, min: number, max: number, options?: any) {
    return []
  }
  
  async zrem(key: string, ...members: any[]) {
    return members.length
  }
  
  async zcard(key: string) {
    return 0
  }
}

// Use real Redis if configured, otherwise use mock for development
export const redis = REDIS_URL.includes("upstash") 
  ? new Redis({
      url: REDIS_URL,
      token: REDIS_TOKEN,
    })
  : new MockRedis() as any

// Cache helpers
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key)
      return data as T | null
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error)
      return null
    }
  },
  
  async set(
    key: string,
    value: any,
    options?: { ex?: number; px?: number }
  ): Promise<void> {
    try {
      if (options?.ex) {
        await redis.setex(key, options.ex, JSON.stringify(value))
      } else if (options?.px) {
        await redis.set(key, JSON.stringify(value), "PX", options.px)
      } else {
        await redis.set(key, JSON.stringify(value))
      }
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error)
    }
  },
  
  async delete(key: string): Promise<void> {
    try {
      await redis.del(key)
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error)
    }
  },
  
  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      console.error(`Cache invalidate error for pattern ${pattern}:`, error)
    }
  },
}

export async function rateLimit(
  identifier: string,
  limit: number = 10,
  window: number = 60
): Promise<{ success: boolean; remaining: number }> {
  const key = `rate_limit:${identifier}`
  const current = await redis.incr(key)
  
  if (current === 1) {
    await redis.expire(key, window)
  }
  
  return {
    success: current <= limit,
    remaining: Math.max(0, limit - current),
  }
}