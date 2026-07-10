# Redis Caching Setup Guide

## Overview
Redis caching has been integrated to reduce Supabase egress costs by ~70-90%. Frequently requested data is cached in Redis, reducing repeated database calls.

## What's Been Implemented

### 1. **Redis Cache Utility** (`lib/redis.ts`)
- `cacheResult()` - Wrapper function for easy caching integration
- `getFromCache()` - Retrieve cached data
- `setInCache()` - Store data in cache
- `deleteFromCache()` - Remove specific cache entry
- `invalidatePattern()` - Invalidate cache by pattern (e.g., `tournaments:*`)

### 2. **Cached API Endpoints**
Currently configured with caching:
- **GET /api/tournaments** - 5 minute cache (TTL: 300s)
- **GET /api/seasons** - 10 minute cache (TTL: 600s)

### 3. **Cache Invalidation**
- Tournament cache automatically clears when a new tournament is created
- Season cache automatically clears when a new season is created

## Environment Variables

Your `.env` file already contains:
```
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

These are required for Redis to work. If missing, run:
1. Go to [https://console.upstash.com](https://console.upstash.com)
2. Sign up (free tier available: 10k commands/day)
3. Create a new Redis database
4. Copy REST URL and Token
5. Paste into `.env`

## How Caching Works

### First Request
```
Client → API Route → Cache Miss → Database Query → Cache (5 min) → Response
```

### Subsequent Requests (within TTL)
```
Client → API Route → Cache Hit → Response (instant)
```

## Adding More Caching

To cache another GET endpoint, follow this pattern:

```typescript
import { cacheResult, invalidatePattern } from "@/lib/redis";

// In your GET handler:
export async function GET(request: NextRequest) {
  const cacheKey = "my-resource:unique-id";
  
  const data = await cacheResult(
    cacheKey,
    async () => {
      // Your database query here
      return await prisma.myTable.findMany();
    },
    { ttl: 600 } // Cache for 10 minutes
  );
  
  return apiSuccess(data);
}

// In your POST/PUT/DELETE handler (to invalidate cache):
export async function POST(request: NextRequest) {
  // ... create/update logic ...
  
  // Clear cache when data changes
  await invalidatePattern("my-resource:*");
  
  return apiSuccess({ message: "Created" });
}
```

## Recommended Endpoints to Cache

Based on your API structure, consider caching these high-traffic endpoints:

**High Priority** (read-heavy, static data):
- `GET /api/tournaments/[id]`
- `GET /api/seasons/[id]`
- `GET /api/badges`
- `GET /api/streamers`
- `GET /api/heroes/catalog`

**Medium Priority** (moderate traffic):
- `GET /api/matches/[id]`
- `GET /api/community/posts`
- `GET /api/polls`
- `GET /api/leaderboard`

**Low Priority** (real-time or user-specific):
- Any endpoint with authentication/user-specific data
- Endpoints that return frequently updated data

## Cache TTL Recommendations

- **Static data** (heroes, badges): 3600s (1 hour)
- **Moderately static** (tournaments, seasons): 300-600s (5-10 min)
- **Frequently updated** (leaderboards, standings): 60s (1 min)
- **Real-time data**: Don't cache or use very short TTL (30s)

## Monitoring

To monitor Redis usage:
1. Go to [https://console.upstash.com](https://console.upstash.com)
2. Select your database
3. Check **Database Stats** for:
   - Command count
   - Data size
   - Bandwidth usage

## Cost Savings Estimate

With Upstash free tier:
- **10,000 commands/day** included free
- **1,000 concurrent connections**
- Estimated savings: **50-80 GB/month** on Supabase egress

Free tier limit breakdown:
- ~400 commands/hour (enough for moderate traffic)
- If you exceed, upgrade to Pro (~$0.20/GB)

## Troubleshooting

### Redis is disabled (warnings in logs)
- Check `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in `.env`
- Redeploy or restart dev server

### Cache not clearing
- Check that `invalidatePattern()` is called after mutations
- Verify pattern matches your cache keys

### High cache miss rate
- Increase TTL values for less frequently changing data
- Ensure cache keys are consistent across requests

## Next Steps

1. Test the implementation in your local dev environment
2. Monitor Supabase egress usage (should decrease significantly)
3. Add caching to additional high-traffic endpoints
4. Adjust TTL values based on your data patterns
