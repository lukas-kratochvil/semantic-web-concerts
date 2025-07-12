import { Logger, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { loadYamlConfig } from "@semantic-web-concerts/core";
import { GooutModule } from "./concert-portals/goout/goout.module";
import { TicketmasterModule } from "./concert-portals/ticketmaster/ticketmaster.module";
import { TicketportalModule } from "./concert-portals/ticketportal/ticketportal.module";
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
    GooutModule,
    TicketmasterModule,
    TicketportalModule,
  ],
  providers: [Logger],
})
export class AppModule {}
