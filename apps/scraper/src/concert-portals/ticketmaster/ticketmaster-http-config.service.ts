import type {
  HttpModuleOptionsFactory,
  HttpModuleOptions,
} from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { ConfigSchema } from "../../config/schema";

@Injectable()
// eslint-disable-next-line @darraghor/nestjs-typed/injectable-should-be-provided
export class TicketmasterHttpConfigService implements HttpModuleOptionsFactory {
  constructor(private readonly config: ConfigService<ConfigSchema, true>) {}

  createHttpOptions(): HttpModuleOptions {
    return {
      baseURL: this.config.get("ticketmaster.url", { infer: true }),
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      params: {
        apikey: this.config.get("ticketmaster.apiKey", { infer: true }),
      },
    };
  }
}
