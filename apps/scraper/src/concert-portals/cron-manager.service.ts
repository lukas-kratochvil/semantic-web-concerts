import { Inject, Injectable } from "@nestjs/common";
import { Interval, SchedulerRegistry } from "@nestjs/schedule";
import { CUSTOM_PROVIDERS } from "../constants";
import type { ICronJobService } from "./cron-job-service.types";

@Injectable()
export class CronManagerService {
  constructor(
    private readonly schedulerRegistry: SchedulerRegistry,
    @Inject(CUSTOM_PROVIDERS.cronJobServices) private readonly cronJobServices: ICronJobService[]
  ) {}

  @Interval(60_000 * 5)
  runJobs() {
    this.cronJobServices
      .filter((cronJobService) => !cronJobService.isInProcess())
      .forEach((cronJobService) => {
        if (cronJobService.runDate.getTime() <= Date.now()) {
          // TODO: create CronJob instances instead (`this.schedulerRegistry.addCronJob(name, job);`)?
          if (cronJobService.jobType === "timeout") {
            const timeout = setTimeout(cronJobService.run, 1_000);
            this.schedulerRegistry.addTimeout(cronJobService.jobName, timeout);
            // TODO: correct setting next `runDate` so it is always in the future
            cronJobService.runDate = new Date(
              cronJobService.runDate.getTime() + cronJobService.runPeriodInMinutes * 60_000
            );
          } else if (cronJobService.jobType === "interval") {
            const interval = setInterval(cronJobService.run, 1_000);
            this.schedulerRegistry.addInterval(cronJobService.jobName, interval);
          }
        }
      });
  }
}
