import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { AppModule } from "./app.module";
import type { ConfigSchema } from "./config/schema";
import { createWinstonLogger } from "./log/winston-logger";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService<ConfigSchema, true>);

  // Setup logger
  const logger = createWinstonLogger("HANDLER");
  app.useLogger(logger);

  // Starting the app
  const port = config.get("port", { infer: true });
  logger.log(`Handler is running on: http://localhost:${port}`);
  await app.listen(port);
}

void bootstrap();
