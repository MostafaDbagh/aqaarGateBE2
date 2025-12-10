/**
 * Simple in-memory cache utility
 * Used for caching expensive database queries
 */

class SimpleCache {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Get value from cache
   * @param {string} key - Cache key
   * @returns {any|null} - Cached value or null if expired/not found
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  /**
   * Set value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlSeconds - Time to live in seconds (default: 300 = 5 minutes)
   */
  set(key, value, ttlSeconds = 300) {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Delete a specific key from cache
   * @param {string} key - Cache key to delete
   */
  delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (Date.now() > item.expiresAt) {
        expired++;
        this.cache.delete(key);
      } else {
        valid++;
      }
    }
    
    return {
      total: this.cache.size,
      valid,
      expired
    };
  }

  /**
   * Clean expired entries (call periodically)
   */
  cleanExpired() {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Create singleton instance
const cache = new SimpleCache();

// Clean expired entries every 5 minutes
setInterval(() => {
  cache.cleanExpired();
}, 5 * 60 * 1000);

module.exports = cache;


