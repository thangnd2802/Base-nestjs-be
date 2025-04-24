import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import {
  ExampleQueueService,
  GoogleLlmQueueService,
} from 'src/common/constant';
import { Job, Queue } from 'bullmq';
import { GoogleApiKeyManagerService } from 'src/google-llm/google-api-key.service';
import { Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';

@Processor(GoogleLlmQueueService.QUEUE_NAME)
export class GoogleLlmServiceConsumer extends WorkerHost {
  private readonly logger = new Logger(GoogleLlmServiceConsumer.name);

  constructor(
    private readonly apiKeyManager: GoogleApiKeyManagerService,
    // @InjectModel(Example.name)
    // private readonly exampleModel: Model<ExampleDocument>,
    @InjectQueue(ExampleQueueService.QUEUE_NAME.EXAMPLE_QUEUE)
    private readonly exampleQueue: Queue,
  ) {
    super();
  }
  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case GoogleLlmQueueService.JOBS.EXAMPLE:
        return this.doExampleHandle(job);

      default:
        throw new Error(`Unsupported job name: ${job.name}`);
    }
  }

  private async doExampleHandle(job: Job): Promise<any> {
    const jobData = job.data;
    const ai = new GoogleGenAI({ apiKey: 'apiKey' });

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: 'example' + jobData,
      config: {
        temperature: 0.7,
        topP: 0.95,
        topK: 20,
      },
    });

    return response;
  }

  private extractJsonFromString<T>(text: string): T {
    // Regex to match the string between ```json and ```
    const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);

    if (jsonBlockMatch && jsonBlockMatch[1]) {
      return JSON.parse(jsonBlockMatch[1].trim()); // Return the content and trim whitespace
    }

    // If no ```json ... ``` block is found, try to match a potential raw JSON string
    const rawJsonMatch = text.match(/\{[\s\S]*\}/);

    if (rawJsonMatch && rawJsonMatch[0]) {
      try {
        // Attempt to parse it to ensure it's likely valid JSON
        JSON.parse(rawJsonMatch[0]);
        return JSON.parse(rawJsonMatch[0].trim());
      } catch (error) {
        this.logger.error(
          `Error parsing raw JSON: ${error} - Raw JSON: ${rawJsonMatch[0]}`,
        );
        return null;
      }
    }

    return null; // No JSON found in either format
  }
}
