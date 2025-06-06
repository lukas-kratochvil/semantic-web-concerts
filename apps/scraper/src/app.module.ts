import { Logger, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import loadConfig from "./config/loader";
import { TicketmasterModule } from "./concert-portals/ticketmaster/ticketmaster.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [loadConfig],
    }),
    TicketmasterModule,
  ],
  providers: [Logger],
})
export class AppModule {}
