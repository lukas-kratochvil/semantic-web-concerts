import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import {
  MusicEventsQueue,
  type MusicEventsQueueDataType,
  type MusicEventsQueueNameType,
} from "@semantic-web-concerts/core";
import type { Job, Worker } from "bullmq";

@Processor(MusicEventsQueue.name)
export class MusicEventConsumer extends WorkerHost<Worker<MusicEventsQueueDataType, MusicEventsQueueDataType>> {
  #logger = new Logger(MusicEventConsumer.name);

  override async process(
    job: Job<MusicEventsQueueDataType, MusicEventsQueueDataType, MusicEventsQueueNameType>
  ): Promise<undefined> {
    // TODO: process jobs - also, should job contain single MusicEvent or batch of MusicEvents??
    this.#logger.log(job.data);
    await job.updateProgress(-1);
  }
}
