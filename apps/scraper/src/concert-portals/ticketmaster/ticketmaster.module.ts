import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TicketmasterHttpConfigService } from "./ticketmaster-http-config.service";
import { TicketmasterService } from "./ticketmaster.service";

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useClass: TicketmasterHttpConfigService,
    }),
  ],
  providers: [TicketmasterService],
  exports: [TicketmasterService],
})
export class TicketmasterModule {}
