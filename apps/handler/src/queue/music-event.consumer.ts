import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import {
  MusicEventsQueue,
  plainToEntity,
  validateEntity,
  type MusicEventsQueueDataType,
  type MusicEventsQueueNameType,
} from "@semantic-web-concerts/core";
import { MusicEventEntity } from "@semantic-web-concerts/core/entities";
import { RdfEntitySerializerService } from "@semantic-web-concerts/core/rdf";
import type { Job, Worker } from "bullmq";

@Processor(MusicEventsQueue.name)
export class MusicEventConsumer extends WorkerHost<Worker<MusicEventsQueueDataType, MusicEventsQueueDataType>> {
  #logger = new Logger(MusicEventConsumer.name);

  constructor(private readonly rdfSerializer: RdfEntitySerializerService) {
    super();
  }

  /**
   * Processing steps:
   * 1) Transform to MusicEventEntity
   * 2) Validate MusicEventEntity
   * 3) Check if object already exists in the triple store
   *    1) If doesn't exist, continue with step 4)
   *    2) If exists, check if any property is updated
   *        1) If updated, continue with step 4)
   *        2) If not updated, return without further processing
   * 4) Serialize MusicEventEntity to RDF
   * 5) Store RDF in the triple store
   *    1) If step 3) determined that the object is new, perform an INSERT operation
   *    2) If step 3) determined that the object is updated, perform a DELETE + INSERT operation
   */
  override async process(job: Job<MusicEventsQueueDataType, MusicEventsQueueDataType, MusicEventsQueueNameType>) {
    try {
      // 1) Transform to MusicEventEntity
      const musicEvent = plainToEntity(MusicEventEntity, job.data.event);

      // 2) Validate MusicEventEntity
      const validationErrors = await validateEntity(musicEvent);

      if (validationErrors.length > 0) {
        const validationErrorStr = validationErrors
          .map((error) => `Property ${error.property}: ` + error.toString())
          .join("\n");
        throw new Error(validationErrorStr);
      }

      // TODO: step 3) and further steps

      // 4) Serialize MusicEventEntity to RDF
      const rdfData = await this.rdfSerializer.serialize(musicEvent, "text/n-triples");
      return rdfData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : JSON.stringify(error);
      await job.log(errorMessage);
      this.#logger.error(
        `Error processing job ${job.id} [${job.data.event.url}]:\n` + errorMessage,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }
}
