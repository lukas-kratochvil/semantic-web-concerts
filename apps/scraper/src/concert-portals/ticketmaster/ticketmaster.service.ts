import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";
import { TicketmasterResponse } from "./types";
import { catchError, firstValueFrom } from "rxjs";
import { AxiosError } from "axios";
import { Timeout } from "@nestjs/schedule";

@Injectable()
export class TicketmasterService {
  #logger = new Logger(TicketmasterService.name);

  constructor(private readonly http: HttpService) {}

  @Timeout(3000)
  async fetch() {
    const res = await firstValueFrom(
      this.http
        .get<TicketmasterResponse>("events.json", {
          params: {
            size: 3, // TODO: adjust the size
            countryCode: "cz",
            classificationName: ["music"],
            sort: "date,name,desc",
            locale: "cs-CZ", // values adjusted for Czechia, f.e. URLs
          },
        })
        .pipe(
          catchError(
            (error: AxiosError<TicketmasterResponse>) =>
              new Promise<AxiosError<TicketmasterResponse>>((resolve) =>
                resolve(error),
              ),
          ),
        ),
    );

    if (res instanceof AxiosError) {
      this.#logger.error(res.message);
      // TODO: what to do on error?
      return;
    }

    const { data, headers } = res;

    // headers["rate-limit"]
    // headers["rate-limit-available"]
    // headers["rate-limit-over"]
    // headers["rate-limit-reset"]
    this.#logger.log(
      `Limit: ${headers["rate-limit"]}, Available: ${headers["rate-limit-available"]}, Over: ${headers["rate-limit-over"]}, Reset: ${headers["rate-limit-reset"]}`,
    );

    if ("fault" in data) {
      // HTTP 401 - invalid API key
      // HTTP 429 - quota reached
      this.#logger.error(data.fault.faultstring);
      return;
    }

    // TODO: event.dates.status.code: 'onsale', 'offsale', 'cancelled', 'postponed', 'rescheduled'
    const concerts = data._embedded.events.map((event) => ({
      meta: {
        portal: "ticketmaster",
        id: event.id,
      },
      event: {
        name: event.name,
        description: "",
        artists: event._embedded.attractions.map((a) => ({
          name: a.name,
          // country: undefined,
        })),
        genres: [
          ...new Set(
            event.classifications
              .map((c) => [c.genre.name, c.subGenre.name])
              .flat(),
          ),
        ].map((g) => ({ name: g })),
        dateTime: event.dates.start.dateTime ?? event.dates.start.localDate, // `dateTime` not present if f.e. `event.dates.status.code === 'postponed'`
        venues: event._embedded.venues.map((v) => ({
          name: v.name,
          address: v.address.line1,
          location: {
            longitude: v.location.longitude,
            latitude: v.location.latitude,
          },
          url: v.url,
        })),
        ticketsUrl: event.url,
        isSoldOut: event.dates.status.code === "offsale",
      },
    }));

    // TODO: add data to the job-queue for further processing
    this.#logger.log(concerts);
  }
}
