import { Logger, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { loadYamlConfig } from "@semantic-web-concerts/core";
import { configSchema } from "./config/schema";
import { CronManagerModule } from "./cron/cron-manager.module";

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
  ],
  providers: [Logger],
})
export class AppModule {}
