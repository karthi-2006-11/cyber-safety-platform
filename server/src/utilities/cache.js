/**
 * In-Memory TTL Cache Utility for Web Risk & External API Lookups.
 */

class SimpleTTLCache {
  constructor(defaultTTLSeconds = 1800) { // Default 30 minutes TTL
    this.cache = new Map();
    this.defaultTTLMs = defaultTTLSeconds * 1000;
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  set(key, value, ttlSeconds = null) {
    const ttlMs = ttlSeconds ? ttlSeconds * 1000 : this.defaultTTLMs;
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlMs
    });
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

module.exports = new SimpleTTLCache(1800);
