import { BullModule } from "@nestjs/bullmq";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MusicEventsQueue } from "@semantic-web-concerts/core";
import type { ConfigSchema } from "../config/schema";

@Module({
  imports: [
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
    BullModule.registerQueue({ name: MusicEventsQueue.name }),
  ],
  exports: [BullModule],
})
export class QueueModule {}
