import { Logger, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { loadYamlConfig } from "@semantic-web-concerts/core";
import { RdfEntitySerializerService } from "@semantic-web-concerts/core/rdf";
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
