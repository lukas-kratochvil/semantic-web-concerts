import { loadYamlConfig } from "@music-event-connect/core";
import { RdfEntitySerializerService } from "@music-event-connect/core/rdf";
import { Logger, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { configSchema } from "./config/schema";
import { MusicEventConsumer } from "./queue/music-event.consumer";
import { QueueModule } from "./queue/queue.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [
        () =>
          loadYamlConfig("config.yaml", configSchema, { nodeEnv: process.env["NODE_ENV"], port: process.env["PORT"] }),
      ],
    }),
    QueueModule,
  ],
  providers: [Logger, MusicEventConsumer, RdfEntitySerializerService],
})
export class AppModule {}
