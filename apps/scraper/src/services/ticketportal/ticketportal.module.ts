import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { QueueModule } from "../../queue/queue.module";
import { TicketportalService } from "./ticketportal.service";

@Module({
  imports: [ConfigModule, QueueModule],
  providers: [TicketportalService],
  exports: [TicketportalService],
})
export class TicketportalModule {}
