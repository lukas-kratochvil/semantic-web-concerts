import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TicketportalService } from "./ticketportal.service";

@Module({
  imports: [ConfigModule],
  providers: [TicketportalService],
  exports: [TicketportalService],
})
export class TicketportalModule {}
