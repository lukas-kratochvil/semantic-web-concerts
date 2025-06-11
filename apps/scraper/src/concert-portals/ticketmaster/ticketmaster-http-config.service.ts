import type {
  HttpModuleOptionsFactory,
  HttpModuleOptions,
} from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ConfigSchema } from "src/config/schema";

@Injectable()
export class TicketmasterHttpConfigService implements HttpModuleOptionsFactory {
  constructor(
    private readonly config: ConfigService<ConfigSchema["ticketmaster"], true>,
  ) {}

  createHttpOptions(): HttpModuleOptions {
    return {
      baseURL: this.config.get("url"),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      params: {
        apikey: this.config.get("apiKey"),
      },
    };
  }
}
