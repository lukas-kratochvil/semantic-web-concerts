import { Module } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";
import { TicketmasterHttpConfigService } from "./ticketmaster-http-config.service";

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useClass: TicketmasterHttpConfigService,
    }),
  ],
})
export class TicketmasterModule {}
