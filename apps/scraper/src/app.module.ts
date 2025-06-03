import { Logger, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import loadConfig from "./config/loader";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [loadConfig],
    }),
  ],
  providers: [Logger],
})
export class AppModule {}
