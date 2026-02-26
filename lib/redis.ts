// lib/redis.ts
import { Redis } from 'ioredis';

// Allow global `_redisClientPromise` to persist across HMR (Hot Module Replacement) in Next.js development.
// This prevents overwhelming the Redis server with connection limits.
let redis: Redis | undefined;

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redisOptions = {
  maxRetriesPerRequest: 0,
  enableOfflineQueue: false,
  connectTimeout: 2000,
  retryStrategy(times: number) {
    if (times > 2) return null;
    return Math.min(times * 100, 1000);
  }
};

try {
  if (process.env.NODE_ENV === 'production') {
    redis = new Redis(redisUrl, redisOptions);
  } else {
    if (!global._redisClientPromise) {
      global._redisClientPromise = new Redis(redisUrl, redisOptions);
    }
    redis = global._redisClientPromise;
  }
} catch (e) {
  console.error('[Redis] Initialization failed, proceeding without cache:', e);
  // Optional: create a dummy redis client or let it fail gracefully in getOrSetCache
}

declare global {
  // eslint-disable-next-line no-var
  var _redisClientPromise: Redis | undefined;
}

/**
 * Helper to fetch data from cache or from source if cache misses.
 * @param key The Redis cache key
 * @param fetcher The fallback function to fetch data if cache misses
 * @param ttl Time to live in seconds (default: 3600 = 1 hour)
 */
export async function getOrSetCache<T>(key: string, fetcher: () => Promise<T>, ttl: number = 3600): Promise<T> {
  if (!redis) {
    console.log(`[Redis] Not initialized. Fetching from source: ${key}`);
    return await fetcher();
  }

  try {
    const cachedData = await redis.get(key);
    if (cachedData) {
      console.log(`[Redis] Cache Hit: ${key}`);
      return JSON.parse(cachedData) as T;
    }
  } catch (err) {
    console.error(`[Redis] Error reading cache key ${key}:`, err);
  }

  // Cache miss or error reading, fetch from source
  console.log(`[Redis] Cache Miss: ${key}`);
  const data = await fetcher();

  try {
    if (data !== undefined && data !== null) {
      await redis.set(key, JSON.stringify(data), 'EX', ttl);
    }
  } catch (err) {
    console.error(`[Redis] Error setting cache key ${key}:`, err);
  }

  return data;
}

/**
 * Helper to invalidate/delete a specific cache key
 * @param key The Redis cache key
 */
export async function invalidateCache(key: string): Promise<void> {
  if (!redis) return;

  try {
    await redis.del(key);
    console.log(`[Redis] Cache Invalidated: ${key}`);
  } catch (err) {
    console.error(`[Redis] Error invalidating cache key ${key}:`, err);
  }
}

export default redis;
