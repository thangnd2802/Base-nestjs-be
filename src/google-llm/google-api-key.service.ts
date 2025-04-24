import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from 'src/cache/cache.service';
import { ConfigKeys } from '../common/constant';

export interface GoogleLlmServiceKeyUsageEntry {
  count: number;
  lastUsedAt: number;
}

@Injectable()
export class GoogleApiKeyManagerService {
  private readonly logger = new Logger(GoogleApiKeyManagerService.name);

  private readonly freeApiKeys: string[] = [];
  private readonly paidApiKeys: string[] = [];

  private readonly LIMITS = {
    minute: 15,
    day: 1500,
  };

  constructor(
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    this.freeApiKeys = this.configService
      .get<string>(ConfigKeys.FREE_GOOGLE_GEMINI_LLM_SERVICE_API_KEYS)
      .split(',')
      .map((key) => key.trim());
    this.paidApiKeys = this.configService
      .get<string>(ConfigKeys.PAID_GOOGLE_GEMINI_LLM_SERVICE_API_KEYS)
      .split(',')
      .map((key) => key.trim());
  }

  private getCacheKey(apiKey: string, scope: 'minute' | 'day'): string {
    return `google-llm-api-key:usage:${apiKey}:${scope}`;
  }

  private async incrementUsage(
    apiKey: string,
    scope: 'minute' | 'day',
  ): Promise<number> {
    const key = this.getCacheKey(apiKey, scope);
    const usage =
      await this.cacheService.get<GoogleLlmServiceKeyUsageEntry>(key);
    const now = Date.now();
    let count = 1;

    if (usage) {
      const shouldReset =
        scope === 'minute'
          ? now - usage.lastUsedAt >= 60 * 1000
          : new Date(now).getUTCDate() !==
            new Date(usage.lastUsedAt).getUTCDate();

      count = shouldReset ? 1 : usage.count + 1;
    }

    await this.cacheService.set<GoogleLlmServiceKeyUsageEntry>(
      key,
      { count, lastUsedAt: now },
      7 * 24 * 60 * 60 * 1000,
    );
    return count;
  }

  private async isKeyAvailable(apiKey: string): Promise<boolean> {
    const minuteKey = this.getCacheKey(apiKey, 'minute');
    const dayKey = this.getCacheKey(apiKey, 'day');

    const [minuteData, dayData] = await Promise.all([
      this.cacheService.get<GoogleLlmServiceKeyUsageEntry>(minuteKey),
      this.cacheService.get<GoogleLlmServiceKeyUsageEntry>(dayKey),
    ]);

    // eslint-disable-next-line prettier/prettier
    const minuteCount = minuteData ? ( Date.now() - minuteData.lastUsedAt < 60 * 1000 ? minuteData.count : 0) : 0;
    // eslint-disable-next-line prettier/prettier
    const dayCount = dayData ? ( new Date().getUTCDate() === new Date(dayData.lastUsedAt).getUTCDate() ? dayData.count : 0) : 0;

    return minuteCount < this.LIMITS.minute && dayCount < this.LIMITS.day;
  }

  async getAvailableApiKey(): Promise<string | null> {
    for (const key of this.freeApiKeys) {
      const available = await this.isKeyAvailable(key);
      if (available) {
        await this.incrementUsage(key, 'minute');
        await this.incrementUsage(key, 'day');
        return key;
      }
    }
    this.logger.warn('All API Free keys are exhausted (rate limit reached)');

    if (this.paidApiKeys.length === 0) {
      this.logger.error('No paid API keys available');
      return null;
    }

    const randomIndex = Math.floor(Math.random() * this.paidApiKeys.length);
    const apiKey = this.paidApiKeys[randomIndex];
    return apiKey;
  }
}
