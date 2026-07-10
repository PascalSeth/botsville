import { Redis } from "@upstash/redis";

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.warn("Redis caching disabled: Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");
}

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 3600 = 1 hour)
  tags?: string[]; // For cache invalidation
}

export async function getFromCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const data = await redis.get<T>(key);
    return data || null;
  } catch (error) {
    console.error(`Redis GET error for key ${key}:`, error);
    return null;
  }
}

export async function setInCache<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
  if (!redis) return;
  try {
    const ttl = options?.ttl || 3600; // Default 1 hour
    await redis.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error(`Redis SET error for key ${key}:`, error);
  }
}

export async function deleteFromCache(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (error) {
    console.error(`Redis DEL error for key ${key}:`, error);
  }
}

export async function invalidatePattern(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    console.error(`Redis pattern invalidation error for ${pattern}:`, error);
  }
}

// Cache wrapper function for easy integration
export async function cacheResult<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  // Try to get from cache
  const cached = await getFromCache<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch and store
  const result = await fetchFn();
  await setInCache(key, result, options);
  return result;
}
