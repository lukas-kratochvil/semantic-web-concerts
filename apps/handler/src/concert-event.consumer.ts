import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import {
  ConcertEventsQueue,
  type ConcertEventsQueueDataType,
  type ConcertEventsQueueNameType,
} from "@semantic-web-concerts/core";
import type { Job, Worker } from "bullmq";

@Processor(ConcertEventsQueue.name)
export class ConcertEventConsumer extends WorkerHost<Worker<ConcertEventsQueueDataType, ConcertEventsQueueDataType>> {
  #logger = new Logger(ConcertEventConsumer.name);

  override async process(
    job: Job<ConcertEventsQueueDataType, ConcertEventsQueueDataType, ConcertEventsQueueNameType>
  ): Promise<undefined> {
    // TODO: process jobs - also, should job contain single ConcertEvent or batch of ConcertEvents??
    this.#logger.log(job.data);
    await job.updateProgress(-1);
  }
}
