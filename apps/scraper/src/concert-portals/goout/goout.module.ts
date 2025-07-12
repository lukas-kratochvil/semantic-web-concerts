import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { QueuesModule } from "../../queue.module";
import { GooutService } from "./goout.service";

@Module({
  imports: [ConfigModule, QueuesModule],
  providers: [GooutService],
  exports: [GooutService],
})
export class GooutModule {}
