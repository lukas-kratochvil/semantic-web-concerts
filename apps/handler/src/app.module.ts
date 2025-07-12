import { BullModule } from "@nestjs/bullmq";
import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ConcertEventsQueue, loadYamlConfig } from "@semantic-web-concerts/core";
import { ConcertEventConsumer } from "./concert-event.consumer";
import { configSchema, type ConfigSchema } from "./config/schema";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [
        () =>
          loadYamlConfig("config.yaml", configSchema, { nodeEnv: process.env["NODE_ENV"], port: process.env["PORT"] }),
      ],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<ConfigSchema, true>) => ({
        connection: {
          host: config.get("redis.host", { infer: true }),
          port: config.get("redis.port", { infer: true }),
        },
      }),
    }),
    BullModule.registerQueue({ name: ConcertEventsQueue.name }),
  ],
  providers: [Logger, ConcertEventConsumer],
})
export class AppModule {}
