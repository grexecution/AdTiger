import Redis from 'ioredis'

// Create Redis connection
// In production, use REDIS_URL from environment
export const redis = new Redis(
  process.env.REDIS_URL || 'redis://localhost:6379',
  {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  }
)

// Clone for BullMQ (it needs separate connections)
export const createRedisConnection = () => {
  return new Redis(
    process.env.REDIS_URL || 'redis://localhost:6379',
    {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    }
  )
}

redis.on('error', (error) => {
  console.error('Redis connection error:', error)
})

redis.on('connect', () => {
  console.log('✅ Redis connected')
})