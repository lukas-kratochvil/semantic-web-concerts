import { loadYamlConfig } from "@music-event-connect/core";
import { Logger, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { configSchema } from "./config/schema";
import { CronManagerModule } from "./cron/cron-manager.module";
import { QueueModule } from "./queue/queue.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [
        () =>
          loadYamlConfig("config.yaml", configSchema, { nodeEnv: process.env["NODE_ENV"], port: process.env["PORT"] }),
      ],
    }),
    ScheduleModule.forRoot(),
    CronManagerModule,
    QueueModule,
  ],
  providers: [Logger],
})
export class AppModule {}
