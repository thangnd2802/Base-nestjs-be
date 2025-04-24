/* eslint-disable prettier/prettier */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { ExampleQueueService } from 'src/common/constant';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
import { ExampleJobDataDto } from './dto/example.jobdata.dto';


@Processor(ExampleQueueService.QUEUE_NAME.EXAMPLE_QUEUE)
export class ExampleConsumer extends WorkerHost {
  private readonly logger = new Logger(ExampleConsumer.name);

  constructor(
    
    // @InjectModel(Example.name)
    // private readonly exampleModel: Model<ExampleDocument>,
  ) {
    super();
  }
  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case ExampleQueueService.JOBS.EXAMPLE_JOB:
        return this.doExampleHandle(job);

      default:
        throw new Error(`Unsupported job name: ${job.name}`);
    }
  }

  private async doExampleHandle(job: Job): Promise<any> {
    try {
      const jobData: ExampleJobDataDto = job.data;
      this.logger.log(
        `Successfully processed job ${job.id} for ${JSON.stringify(jobData)}`,
      );
      return {
        status: 'success',
        message: `Successfully processed job ${job.id} for ${JSON.stringify(jobData)}`,
      };
    } catch (err) {
      this.logger.error(`Error processing job ${job.id}: ${err}`);
      await job.moveToDelayed(Date.now() + 1000 * 60 * 1); // Retry after 1 minutes
    }
  }
}
