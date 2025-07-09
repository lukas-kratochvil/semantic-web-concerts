import { BullModule } from "@nestjs/bullmq";
import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { ConcertEventsQueue } from "@semantic-web-concerts/shared";
import { GooutModule } from "./concert-portals/goout/goout.module";
import { TicketmasterModule } from "./concert-portals/ticketmaster/ticketmaster.module";
import { TicketportalModule } from "./concert-portals/ticketportal/ticketportal.module";
import loadConfig from "./config/loader";
import type { ConfigSchema } from "./config/schema";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [loadConfig],
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
    ScheduleModule.forRoot(),
    GooutModule,
    TicketmasterModule,
    TicketportalModule,
  ],
  providers: [Logger],
})
export class AppModule {}
