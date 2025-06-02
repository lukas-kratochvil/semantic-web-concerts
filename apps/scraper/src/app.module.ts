import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import loadConfig from "./config/loader";

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [loadConfig],
    }),
  ],
})
export class AppModule {}
