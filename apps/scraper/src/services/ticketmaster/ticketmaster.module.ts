import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { QueuesModule } from "../../queue.module";
import { TicketmasterHttpConfigService } from "./ticketmaster-http-config.service";
import { TicketmasterService } from "./ticketmaster.service";

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useClass: TicketmasterHttpConfigService,
    }),
    QueuesModule,
  ],
  providers: [TicketmasterService],
  exports: [TicketmasterService],
})
export class TicketmasterModule {}
