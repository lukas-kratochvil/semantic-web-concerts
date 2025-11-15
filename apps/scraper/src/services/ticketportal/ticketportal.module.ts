import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { QueuesModule } from "../../queue.module";
import { TicketportalService } from "./ticketportal.service";

@Module({
  imports: [ConfigModule, QueuesModule],
  providers: [TicketportalService],
  exports: [TicketportalService],
})
export class TicketportalModule {}
