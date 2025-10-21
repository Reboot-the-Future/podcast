// lib/rate-limit.ts
import { LRUCache } from 'lru-cache';

type RateLimitOptions = {
  interval: number;
  uniqueTokenPerInterval: number;
};

export function rateLimit(options: RateLimitOptions) {
  const tokenCache = new LRUCache<string, number[]>({
    max: options.uniqueTokenPerInterval,
    ttl: options.interval,
  });

  return {
    check: async (identifier: string, limit: number): Promise<void> => {
      const now = Date.now();
      const tokenCount = tokenCache.get(identifier) || [];
      
      // Filter out old timestamps
      const recentTokens = tokenCount.filter(
        (timestamp) => now - timestamp < options.interval
      );

      if (recentTokens.length >= limit) {
        throw new Error('Rate limit exceeded');
      }

      recentTokens.push(now);
      tokenCache.set(identifier, recentTokens);
    },
  };
}