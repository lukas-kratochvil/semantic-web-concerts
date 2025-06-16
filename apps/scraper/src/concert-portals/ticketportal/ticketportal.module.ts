import { Module } from "@nestjs/common";
import { TicketportalService } from "./ticketportal.service";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [ConfigModule],
  providers: [TicketportalService],
  exports: [TicketportalService],
})
export class TicketportalModule {}
