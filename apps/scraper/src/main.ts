import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { ConfigSchema } from "./config/schema";
import { ConfigService } from "@nestjs/config";
import { createWinstonLogger } from "./log/winston-logger";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService<ConfigSchema, true>);

  // Setup logger
  const logger = createWinstonLogger("SCRAPER");
  app.useLogger(logger);

  // Starting the app
  const port = config.get("port", { infer: true });
  await app.listen(port);
}

bootstrap();
