import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { TicketmasterResponse } from "./types";
import { catchError, firstValueFrom } from "rxjs";
import type { AxiosError } from "axios";

@Injectable()
export class TicketmasterService {
  #logger = new Logger(TicketmasterService.name);

  constructor(private readonly http: HttpService) {}

  async fetch() {
    // TODO: use `firstValueFrom()` or `lastValueFrom()`? (https://docs.nestjs.com/techniques/http-module#full-example)
    const { data } = await firstValueFrom(
      this.http
        .get<TicketmasterResponse>("events.json", {
          params: {
            size: 3,
            countryCode: "cz",
            sort: "date,name,desc",
            classificationName: ["music"],
          },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.#logger.error(error.response?.data);
            throw error;
          }),
        ),
    );
    // TODO: add data to the job-queue for further processing
    this.#logger.debug(data);
  }
}
