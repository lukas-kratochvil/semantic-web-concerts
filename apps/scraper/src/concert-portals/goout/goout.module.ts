import { Module } from "@nestjs/common";
import { GooutService } from "./goout.service";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [ConfigModule],
  providers: [GooutService],
  exports: [GooutService],
})
export class GooutModule {}
