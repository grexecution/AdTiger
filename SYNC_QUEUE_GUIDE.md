# AdTiger Professional Queue System Guide

## 🎯 Overview

AdTiger uses a professional-grade queue system built with **BullMQ** and **Redis** to handle data synchronization from advertising platforms (Meta, Google Ads). This system is designed to scale to 1000+ users with robust error handling, rate limiting, and retry mechanisms.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │    │   Redis Queue   │    │  Worker Process │
│                 │    │                 │    │                 │
│ • Manual Sync   │───▶│ • Job Storage   │───▶│ • Job Processing│
│ • API Endpoints │    │ • Prioritization│    │ • Error Handling│
│ • Status Check  │    │ • Rate Limiting │    │ • Retry Logic   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └──────────────▶│  Cron Scheduler │◀─────────────┘
                        │                 │
                        │ • Hourly Sync   │
                        │ • Queue Cleanup │
                        └─────────────────┘
```

## 🚀 Key Features

### ✅ **Professional Queue Management**
- **BullMQ**: Enterprise-grade queue system with Redis
- **Job Prioritization**: Manual syncs get highest priority
- **Concurrency Control**: Configurable per provider (Meta: 2, Google: 1)
- **Automatic Retries**: 3 attempts with exponential backoff
- **Dead Letter Queue**: Failed jobs stored for debugging

### ✅ **Rate Limiting**
- **Per Provider**: Different limits for Meta (200/hour) and Google (100/hour)
- **Per Minute**: Conservative limits to prevent API throttling
- **Per Account**: Individual rate limiting per user account
- **Redis-based**: Distributed rate limiting across instances

### ✅ **Error Handling**
- **Categorized Errors**: `RATE_LIMIT`, `API_ERROR`, `VALIDATION_ERROR`, `NETWORK_ERROR`
- **Retry Logic**: Only retryable errors are retried
- **Error Tracking**: All errors logged to database with context
- **Connection Status**: Automatic status updates for provider connections

### ✅ **Monitoring & Observability**
- **Real-time Status**: Live queue statistics and job progress
- **Sync History**: Complete audit trail of all sync operations
- **Performance Metrics**: Success rates, duration tracking, error analytics
- **Health Checks**: Cron job monitoring and queue health

## 📊 Queue Types

### 1. **Campaign Sync Queue**
- **Purpose**: Sync campaigns, ad sets, and ads
- **Priority Levels**: Manual (1), Scheduled (5), Retry (10)
- **Concurrency**: 3 jobs simultaneously
- **Retry**: 3 attempts with 2s initial delay

### 2. **Ad Sync Queue** (Future)
- **Purpose**: Individual ad synchronization
- **Use Case**: Real-time ad updates

### 3. **Insights Sync Queue** (Future)
- **Purpose**: Performance metrics synchronization
- **Use Case**: Analytics data updates

## 🔄 Sync Types

### **Manual Sync**
- **Trigger**: User-initiated via UI
- **Priority**: Highest (1)
- **Use Case**: Immediate data refresh

### **Scheduled Sync**
- **Trigger**: Automated hourly cron job
- **Priority**: Normal (5)
- **Use Case**: Regular data updates

### **Incremental Sync** (Future)
- **Trigger**: Change-based triggers
- **Priority**: Normal (5)
- **Use Case**: Efficient delta updates

## 🛠️ Setup & Configuration

### **1. Environment Variables**

```bash
# Queue System
BULLMQ_REDIS_URL="redis://localhost:6379"  # Production: separate Redis instance
CRON_SECRET="your-secure-random-secret"    # For cron job authentication

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/adtiger"

# Provider APIs
META_APP_ID="your-meta-app-id"
META_APP_SECRET="your-meta-app-secret"
```

### **2. Start the Worker**

```bash
# Development
npm run worker:dev

# Production
npm run worker

# With PM2 (recommended for production)
pm2 start "npm run worker" --name adtiger-worker
```

### **3. Database Migration**

```bash
npx prisma db push
# or
npx prisma migrate dev --name sync-queue-system
```

## 📡 API Endpoints

### **Manual Sync**
```http
POST /api/sync/manual
Content-Type: application/json

{
  "provider": "meta",
  "campaignIds": ["optional-campaign-ids"]
}
```

### **Sync Status**
```http
GET /api/sync/status?provider=meta
```

### **Queue Statistics**
```http
GET /api/sync/status
```

### **Cron Job (Hourly)**
```http
GET /api/cron/sync-hourly
Authorization: Bearer YOUR_CRON_SECRET
```

## 🎛️ Usage Examples

### **1. Trigger Manual Sync**

```typescript
const response = await fetch('/api/sync/manual', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    provider: 'meta'
  })
})

const result = await response.json()
console.log(result.jobId) // Queue job ID
```

### **2. Check Sync Status**

```typescript
const status = await fetch('/api/sync/status?provider=meta')
const data = await status.json()

console.log(data.queue.isActive)    // Currently syncing?
console.log(data.queue.queuePosition) // Position in queue
console.log(data.recentSyncs)       // Recent sync history
```

### **3. Monitor Queue Health**

```typescript
const health = await fetch('/api/cron/sync-hourly', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${CRON_SECRET}` }
})

const stats = await health.json()
console.log(stats.stats.syncs24h.successRate) // 24h success rate
```

## ⚡ Performance Optimization

### **Rate Limiting Strategy**
```typescript
// Conservative per-minute limits to prevent throttling
const RATE_LIMITS = {
  meta: {
    requestsPerHour: 200,
    requestsPerMinute: 10,
    concurrentJobs: 2,
  },
  google: {
    requestsPerHour: 100,
    requestsPerMinute: 5,
    concurrentJobs: 1,
  }
}
```

### **Job Prioritization**
- **Manual Sync**: Priority 1 (immediate processing)
- **Scheduled Sync**: Priority 5 (normal processing)
- **Retry Jobs**: Priority 10 (lower processing)

### **Memory Management**
- **Completed Jobs**: Keep only 10 most recent
- **Failed Jobs**: Keep 20 for debugging
- **Automatic Cleanup**: Runs hourly

## 🐛 Error Handling

### **Error Categories**
1. **RATE_LIMIT**: API throttling (retryable)
2. **API_ERROR**: Authentication/authorization (not retryable)
3. **VALIDATION_ERROR**: Invalid data (not retryable)
4. **NETWORK_ERROR**: Connection issues (retryable)
5. **UNKNOWN**: Uncategorized errors (retryable)

### **Retry Strategy**
```typescript
{
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000  // Start with 2s, then 4s, then 8s
  }
}
```

## 📈 Monitoring & Alerting

### **Key Metrics to Monitor**
- Queue depth (jobs waiting)
- Job processing rate (jobs/minute)
- Error rate (failed jobs %)
- Provider connection health
- Sync success rate per account

### **Health Check Endpoint**
```http
POST /api/cron/sync-hourly
Authorization: Bearer YOUR_CRON_SECRET

Response:
{
  "healthy": true,
  "stats": {
    "connections": { "total": 150, "active": 145 },
    "syncs24h": { "total": 1200, "failed": 24, "successRate": "98.0%" },
    "queue": { "waiting": 5, "active": 2, "completed": 1180 }
  }
}
```

## 🚀 Production Deployment

### **1. Redis Setup**
```bash
# Separate Redis instance for BullMQ
BULLMQ_REDIS_URL="redis://queue-redis:6379"

# Or Redis Cluster for high availability
BULLMQ_REDIS_URL="redis://cluster-node1:6379,cluster-node2:6379"
```

### **2. Worker Scaling**
```bash
# Multiple worker instances
pm2 start ecosystem.config.js

# ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'adtiger-worker-1',
      script: 'npm',
      args: 'run worker',
      instances: 1,
    },
    {
      name: 'adtiger-worker-2',
      script: 'npm',
      args: 'run worker',
      instances: 1,
    }
  ]
}
```

### **3. Cron Job Setup**
```bash
# Vercel cron (vercel.json)
{
  "crons": [
    {
      "path": "/api/cron/sync-hourly",
      "schedule": "0 * * * *"
    }
  ]
}

# Or system cron
0 * * * * curl -H "Authorization: Bearer $CRON_SECRET" https://your-app.com/api/cron/sync-hourly
```

## 🔍 Troubleshooting

### **Common Issues**

#### **Queue Not Processing Jobs**
```bash
# Check Redis connection
redis-cli ping

# Check worker logs
pm2 logs adtiger-worker

# Restart worker
pm2 restart adtiger-worker
```

#### **High Error Rate**
```bash
# Check recent errors
curl "https://your-app.com/api/sync/status" | jq '.stats.errorCategories'

# Check provider connections
curl "https://your-app.com/api/sync/status" | jq '.providers[].connection'
```

#### **Rate Limiting Issues**
- Adjust `requestsPerMinute` limits in worker configuration
- Increase delay between API calls
- Check provider API quotas

### **Debug Commands**

```bash
# View queue status
npm run worker -- --inspect

# Check database sync history
psql -d adtiger -c "SELECT * FROM \"SyncHistory\" ORDER BY \"startedAt\" DESC LIMIT 10;"

# Monitor Redis queue
redis-cli keys "bull:*" | head -10
```

## 🎯 Best Practices

1. **Always run workers separately** from the web application
2. **Use separate Redis instances** for cache vs. queue in production  
3. **Monitor queue depth** to prevent job buildup
4. **Set up alerting** for high error rates
5. **Regular cleanup** of old jobs and sync history
6. **Test rate limits** with your actual API quotas
7. **Use PM2 or similar** for worker process management
8. **Implement proper logging** with structured log format

## 🔮 Future Enhancements

- **Google Ads Integration**: Full Google Ads API support
- **Real-time Webhooks**: Instant sync triggers from providers  
- **Advanced Analytics**: ML-based sync optimization
- **Multi-region Queues**: Geographic queue distribution
- **Custom Sync Rules**: User-defined sync schedules
- **Bulk Operations**: Batch API calls for efficiency

---

This queue system is production-ready and designed to handle enterprise-scale advertising data synchronization with reliability and performance. 🚀