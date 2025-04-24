import { Global, Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConfigKeys } from 'src/common/constant';
import { CacheService } from './cache.service';
import { createKeyv } from '@keyv/redis';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get(ConfigKeys.REDIS_HOST);
        const port = configService.get(ConfigKeys.REDIS_PORT);
        const password = configService.get(ConfigKeys.REDIS_PASSWORD);
        const db = configService.get(ConfigKeys.REDIS_DB);
        let redisUrl = `redis://${host}:${port}`;

        if (password) {
          redisUrl = `redis://:${password}@${host}:${port}`;
        }

        if (db !== undefined) {
          redisUrl = `${redisUrl}/${db}`;
        }

        return {
          stores: [createKeyv(redisUrl)],
        };
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheService],
})
export class AppCacheModule {}
