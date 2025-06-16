import { Logger, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import loadConfig from "./config/loader";
import { GooutModule } from "./concert-portals/goout/goout.module";
import { TicketmasterModule } from "./concert-portals/ticketmaster/ticketmaster.module";
import { TicketportalModule } from "./concert-portals/ticketportal/ticketportal.module";
import { ScheduleModule } from "@nestjs/schedule";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [loadConfig],
    }),
    ScheduleModule.forRoot(),
    GooutModule,
    TicketmasterModule,
    TicketportalModule,
  ],
  providers: [Logger],
})
export class AppModule {}
