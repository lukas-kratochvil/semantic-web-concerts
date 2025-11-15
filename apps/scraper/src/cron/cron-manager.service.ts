import { Inject, Injectable, Logger } from "@nestjs/common";
import { Interval, SchedulerRegistry } from "@nestjs/schedule";
import { minutesToMilliseconds } from "date-fns";
import { CUSTOM_PROVIDERS } from "../constants";
import type { ICronJobService } from "./cron-job-service.interface";

@Injectable()
export class CronManagerService {
  readonly #logger = new Logger(CronManagerService.name);

  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    @Inject(CUSTOM_PROVIDERS.cronJobServices) private readonly cronJobServices: ICronJobService[]
  ) {}

  @Interval(minutesToMilliseconds(5))
  runJobs() {
    this.cronJobServices
      .filter((cronJobService) => !cronJobService.isInProcess())
      .forEach((cronJobService) => {
        if (cronJobService.getRunDate().getTime() <= Date.now()) {
          this.#logger.log("Run job: " + cronJobService.jobName);

          if (cronJobService.jobType === "timeout") {
            const timeout = setTimeout(async () => {
              try {
                await cronJobService.run();
                this.schedulerRegistry.deleteTimeout(cronJobService.jobName);
                this.#logger.log("Job '" + cronJobService.jobName + "' has finished.");
              } catch (e) {
                this.#logger.error("Job '" + cronJobService.jobName + "' thrown error:", e);
              }
            }, 1_000);
            this.schedulerRegistry.addTimeout(cronJobService.jobName, timeout);
          } else if (cronJobService.jobType === "interval") {
            const interval = setInterval(async () => {
              try {
                await cronJobService.run();

                if (cronJobService.getRunDate().getTime() > Date.now()) {
                  this.schedulerRegistry.deleteInterval(cronJobService.jobName);
                  this.#logger.log("Job '" + cronJobService.jobName + "' has finished.");
                }
              } catch (e) {
                this.#logger.error("Job '" + cronJobService.jobName + "' thrown error:", e);
              }
            }, 1_000);
            this.schedulerRegistry.addInterval(cronJobService.jobName, interval);
          }
        }
      });
  }
}
