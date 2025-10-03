import { Logger, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { loadYamlConfig } from "@semantic-web-concerts/core";
import { CronManagerModule } from "./concert-portals/cron-manager.module";
import { configSchema } from "./config/schema";

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
