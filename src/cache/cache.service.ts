import { Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | null> {
    return (await this.cacheManager.get<T>(key)) || null;
  }

  async set<T>(key: string, value: T, ttl = 3600000): Promise<void> {
    await this.cacheManager.set(key, value, ttl); // TTL in ms
  }

  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }
}
