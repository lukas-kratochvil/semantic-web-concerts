import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { QueueModule } from "../../queue/queue.module";
import { TicketmasterHttpConfigService } from "./ticketmaster-http-config.service";
import { TicketmasterService } from "./ticketmaster.service";

@Module({
  imports: [
    HttpModule.registerAsync({
      imports: [ConfigModule],
      useClass: TicketmasterHttpConfigService,
    }),
    QueueModule,
  ],
  providers: [TicketmasterService],
  exports: [TicketmasterService],
})
export class TicketmasterModule {}
