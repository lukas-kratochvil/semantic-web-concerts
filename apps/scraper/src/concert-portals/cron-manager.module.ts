import { Module } from "@nestjs/common";
import { CUSTOM_PROVIDERS } from "../constants";
import { CronManagerService } from "./cron-manager.service";
import { GooutModule } from "./goout/goout.module";
import { GooutService } from "./goout/goout.service";
import { TicketmasterModule } from "./ticketmaster/ticketmaster.module";
import { TicketmasterService } from "./ticketmaster/ticketmaster.service";
import { TicketportalModule } from "./ticketportal/ticketportal.module";
import { TicketportalService } from "./ticketportal/ticketportal.service";

@Module({
  imports: [GooutModule, TicketmasterModule, TicketportalModule],
  providers: [
    CronManagerService,
    {
      provide: CUSTOM_PROVIDERS.cronJobServices,
      useFactory: (goout, ticketportal, ticketmaster) => [goout, ticketportal, ticketmaster],
      inject: [GooutService, TicketportalService, TicketmasterService],
    },
  ],
  exports: [CronManagerService],
})
export class CronManagerModule {}
