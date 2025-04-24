import { Module } from '@nestjs/common';
// import { MongooseModule } from '@nestjs/mongoose';
import { ConfigKeys, ExampleQueueService } from 'src/common/constant';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExampleConsumer } from './example.consumer';

@Module({
  imports: [
    // MongooseModule.forFeature([{ name: Example.name, schema: ExampleSchema }]),
    BullModule.registerQueueAsync({
      name: ExampleQueueService.QUEUE_NAME.EXAMPLE_QUEUE,
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
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: false,
          removeOnFail: false,
        },
      }),
    }),
    BullBoardModule.forFeature({
      name: ExampleQueueService.QUEUE_NAME.EXAMPLE_QUEUE,
      adapter: BullMQAdapter, //or use BullAdapter if you're using bull instead of bullMQ
    }),
  ],
  providers: [ExampleConsumer],
  exports: [BullModule],
})
export class BotReplyModule {}
