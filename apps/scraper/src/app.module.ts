import { Logger, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import loadConfig from "./config/loader";
import { TicketmasterModule } from "./concert-portals/ticketmaster/ticketmaster.module";
import { GooutModule } from "./concert-portals/goout/goout.module";
import { ScheduleModule } from "@nestjs/schedule";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [loadConfig],
    }),
    ScheduleModule.forRoot(),
    TicketmasterModule,
    GooutModule,
  ],
  providers: [Logger],
})
export class AppModule {}
