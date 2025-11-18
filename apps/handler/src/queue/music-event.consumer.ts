import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import {
  MusicEventsQueue,
  type MusicEventsQueueDataType,
  type MusicEventsQueueNameType,
} from "@semantic-web-concerts/core";
import type { Job, Worker } from "bullmq";
import { plainToClass } from "class-transformer";
import { validate } from "class-validator";
import { MusicEventEntity } from "../entities/music-event.entity";

@Processor(MusicEventsQueue.name)
export class MusicEventConsumer extends WorkerHost<Worker<MusicEventsQueueDataType, MusicEventsQueueDataType>> {
  #logger = new Logger(MusicEventConsumer.name);

  /**
   * Processing steps:
   * 1) Transform to MusicEventEntity
   * 2) Validate MusicEventEntity
   * 3) Check if object already exists in the triple store
   *    - If doesn't exist, continue with step 4)
   *    - If exists, check if any property is updated
   *        - If updated, continue with step 4)
   *        - If not updated, return without further processing
   * 4) Serialize MusicEventEntity to RDF
   * 5) Store RDF in the triple store
   *    - If step 3) determined that the object is new, perform an INSERT operation
   *    - If step 3) determined that the object is updated, perform a DELETE + INSERT operation
   */
  override async process(job: Job<MusicEventsQueueDataType, MusicEventsQueueDataType, MusicEventsQueueNameType>) {
    try {
      // 1) Transform to MusicEventEntity
      const musicEvent = plainToClass(MusicEventEntity, job.data.event);

      // 2) Validate MusicEventEntity
      const validationErrors = await validate(musicEvent);

      if (validationErrors.length > 0) {
        const validationErrorStr = validationErrors
          .map((error) => `Property ${error.property}: ` + error.toString())
          .join("\n");
        throw new Error(MusicEventEntity.name + " validation failed:\n" + validationErrorStr);
      }

      // TODO: step 3) and further steps
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      await job.log(errorMessage);
      this.#logger.error(`Error processing job ${job.id}: ` + errorMessage);
      throw error;
    }
  }
}
