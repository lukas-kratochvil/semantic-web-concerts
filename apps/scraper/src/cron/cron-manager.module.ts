import { Module } from "@nestjs/common";
import { CUSTOM_PROVIDERS } from "../constants";
import { GooutModule } from "../services/goout/goout.module";
import { GooutService } from "../services/goout/goout.service";
import { TicketmasterModule } from "../services/ticketmaster/ticketmaster.module";
import { TicketmasterService } from "../services/ticketmaster/ticketmaster.service";
import { TicketportalModule } from "../services/ticketportal/ticketportal.module";
import { TicketportalService } from "../services/ticketportal/ticketportal.service";
import { CronManagerService } from "./cron-manager.service";

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
