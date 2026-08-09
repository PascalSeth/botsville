import { Redis } from "@upstash/redis";

if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
  console.warn("Redis caching disabled: Missing UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN");
}

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
      retry: {
        retries: 1,
        backoff: (retryCount) => Math.min(Math.exp(retryCount) * 50, 200),
      },
    })
  : null;

interface CacheOptions {
  ttl?: number; // Time to live in seconds (default: 3600 = 1 hour)
  tags?: string[]; // For cache invalidation
}

/**
 * Executes a Redis operation with a strict timeout (default 1000ms).
 * Falls back to null/undefined if Redis hangs or times out.
 */
async function withTimeout<T>(promise: Promise<T>, ms: number = 1000): Promise<T | null> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => resolve(null), ms);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    return null;
  }
}

export async function getFromCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    const data = await withTimeout(redis.get<T>(key), 1000);
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
    const valToStore = typeof value === "string" ? value : JSON.stringify(value);
    await withTimeout(redis.setex(key, ttl, valToStore), 1000);
  } catch (error) {
    console.error(`Redis SET error for key ${key}:`, error);
  }
}

export async function deleteFromCache(key: string): Promise<void> {
  if (!redis) return;
  try {
    await withTimeout(redis.del(key), 1000);
  } catch (error) {
    console.error(`Redis DEL error for key ${key}:`, error);
  }
}

export async function invalidatePattern(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    const keys = await withTimeout(redis.keys(pattern), 1000);
    if (keys && keys.length > 0) {
      await withTimeout(redis.del(...keys), 1000);
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

