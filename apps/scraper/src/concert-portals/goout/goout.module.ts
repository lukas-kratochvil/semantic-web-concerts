import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { GooutService } from "./goout.service";

@Module({
  imports: [ConfigModule],
  providers: [GooutService],
  exports: [GooutService],
})
export class GooutModule {}
