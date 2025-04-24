import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ConfigKeys, GoogleLlmQueueService } from 'src/common/constant';
import { GoogleLlmServiceConsumer } from './google-llm-service.consumer';
import { GoogleApiKeyManagerService } from 'src/google-llm/google-api-key.service';
// import { MongooseModule } from '@nestjs/mongoose';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

@Module({
  imports: [
    // MongooseModule.forFeature([]),
    BullModule.registerQueueAsync({
      name: GoogleLlmQueueService.QUEUE_NAME,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get(ConfigKeys.REDIS_HOST),
          port: configService.get(ConfigKeys.REDIS_PORT),
          password: configService.get(ConfigKeys.REDIS_PASSWORD),
          db: configService.get(ConfigKeys.QUEUE_REDIS_DB),
        },
        defaultJobOptions: {
          attempts: configService.get<number>(
            ConfigKeys.GOOGLE_GEMINI_LLM_SERVICE_QUEUE_JOB_ATTEMPTS,
            3,
          ),
          backoff: {
            type: 'exponential',
            delay: configService.get<number>(
              ConfigKeys.GOOGLE_GEMINI_LLM_SERVICE_QUEUE_JOB_BACKOFF_DELAY,
              1000,
            ),
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
    }),
    BullBoardModule.forFeature({
      name: GoogleLlmQueueService.QUEUE_NAME,
      adapter: BullMQAdapter, //or use BullAdapter if you're using bull instead of bullMQ
    }),
  ],
  providers: [GoogleApiKeyManagerService, GoogleLlmServiceConsumer],
  exports: [BullModule],
})
export class GoogleLlmModule {}
