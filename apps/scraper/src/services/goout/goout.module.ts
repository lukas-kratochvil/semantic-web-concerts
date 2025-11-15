import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { QueueModule } from "../../queue/queue.module";
import { GooutService } from "./goout.service";

@Module({
  imports: [ConfigModule, QueueModule],
  providers: [GooutService],
  exports: [GooutService],
})
export class GooutModule {}
