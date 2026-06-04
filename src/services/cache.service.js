const Redis = require('ioredis');

class CacheService {
  constructor() {
    this.redisClient = null;
    this.memoryCache = new Map();
    this.redisConnected = false;
    this.MAX_MEMORY_ENTRIES = 500;

    // Periodic cleanup for expired in-memory entries (every 5 minutes)
    this._cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.memoryCache) {
        if (item.expiry && item.expiry < now) {
          this.memoryCache.delete(key);
        }
      }
    }, 5 * 60 * 1000);
    // Allow Node to exit even if this interval is still pending
    if (this._cleanupInterval.unref) this._cleanupInterval.unref();

    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      console.log('[CacheService] Attempting to connect to Redis...');
      try {
        this.redisClient = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          connectTimeout: 5000,
          retryStrategy(times) {
            if (times > 3) {
              console.warn('[CacheService] Redis connection failed, falling back to memory/DB');
              return null; // Stop retrying
            }
            return Math.min(times * 100, 2000);
          }
        });

        this.redisClient.on('connect', () => {
          console.log('[CacheService] Redis connected successfully.');
          this.redisConnected = true;
        });

        this.redisClient.on('error', (err) => {
          console.error('[CacheService] Redis error:', err.message);
          this.redisConnected = false;
        });

        this.redisClient.on('close', () => {
          this.redisConnected = false;
        });
      } catch (err) {
        console.error('[CacheService] Failed to initialize Redis client:', err.message);
      }
    } else {
      console.log('[CacheService] REDIS_URL not set. Using in-memory fallback cache.');
    }
  }

  /**
   * Get value from cache (Redis or memory fallback)
   */
  async get(key) {
    if (this.redisConnected && this.redisClient) {
      try {
        const val = await this.redisClient.get(key);
        if (val !== null) {
          return JSON.parse(val);
        }
      } catch (err) {
        console.warn(`[CacheService] Redis get failed for key: ${key}, checking memory fallback. Error: ${err.message}`);
      }
    }

    // In-memory fallback
    const memItem = this.memoryCache.get(key);
    if (memItem) {
      if (memItem.expiry && memItem.expiry < Date.now()) {
        this.memoryCache.delete(key);
        return null;
      }
      return memItem.value;
    }

    return null;
  }

  /**
   * Set value in cache
   */
  async set(key, value, ttlSeconds = 300) {
    // Evict oldest entry if at capacity (LRU via Map insertion order)
    if (this.memoryCache.size >= this.MAX_MEMORY_ENTRIES) {
      const oldestKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(oldestKey);
    }

    // Write to memory cache
    this.memoryCache.set(key, {
      value,
      expiry: Date.now() + ttlSeconds * 1000,
    });

    if (this.redisConnected && this.redisClient) {
      try {
        await this.redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
      } catch (err) {
        console.warn(`[CacheService] Redis set failed for key: ${key}. Error: ${err.message}`);
      }
    }
  }

  /**
   * Delete value from cache
   */
  async del(key) {
    this.memoryCache.delete(key);

    if (this.redisConnected && this.redisClient) {
      try {
        await this.redisClient.del(key);
      } catch (err) {
        console.warn(`[CacheService] Redis del failed for key: ${key}. Error: ${err.message}`);
      }
    }
  }
}

module.exports = new CacheService();
