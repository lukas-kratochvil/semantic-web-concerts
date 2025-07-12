import { Logger, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { loadYamlConfig } from "@semantic-web-concerts/core";
import { ConcertEventConsumer } from "./concert-event.consumer";
import { configSchema } from "./config/schema";
import { QueuesModule } from "./queue.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [
        () =>
          loadYamlConfig("config.yaml", configSchema, { nodeEnv: process.env["NODE_ENV"], port: process.env["PORT"] }),
      ],
    }),
    QueuesModule,
  ],
  providers: [Logger, ConcertEventConsumer],
})
export class AppModule {}
