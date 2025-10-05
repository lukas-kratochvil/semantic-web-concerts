type CronJobType = "interval" | "timeout";

export interface ICronJobService {
  /**
   * The name of the action.
   */
  readonly jobName: string;

  /**
   * The type of Cron job that determines how the `run` function should be executed.
   */
  readonly jobType: CronJobType;

  /**
   * The action that should be executed as a Cron job.
   */
  run(): Promise<void>;

  /**
   * The earliest time in UTC datetime when the `run` function can be executed again.
   */
  getRunDate(): Date;

  /**
   *
   */
  readonly runPeriodInMinutes: number;

  /**
   * Determines if the `run` function is still in the process.
   */
  isInProcess(): boolean;
}
