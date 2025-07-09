import { HttpService } from "@nestjs/axios";
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { Interval } from "@nestjs/schedule";
import { type ConcertEventJob, ConcertEventsQueue } from "@semantic-web-concerts/shared";
import { AxiosError } from "axios";
import type { Queue } from "bullmq";
import { catchError, firstValueFrom } from "rxjs";
import { TicketmasterResponse } from "./ticketmaster-api.types";

@Injectable()
export class TicketmasterService {
  readonly #logger = new Logger(TicketmasterService.name);
  #currentPage = 0;

  constructor(
    @InjectQueue(ConcertEventsQueue.name) private readonly concertEventsQueue: Queue<ConcertEventJob>,
    private readonly http: HttpService
  ) {}

  // TODO: correct Cron period time
  // TODO: handle Ticketmaster API request limits
  @Interval(3_000)
  async fetch() {
    // The default quota is 5000 API calls per day and rate limitation of 5 requests per second.
    // Deep Paging: only supports retrieving the 1000th item. i.e. (size * page < 1000).
    const res = await firstValueFrom(
      this.http
        .get<TicketmasterResponse>("events.json", {
          params: {
            page: this.#currentPage, // `page` behaves like an offset, default `size` is 20 items per page
            countryCode: "cz",
            classificationName: ["music"],
            sort: "date,name,asc",
            locale: "cs-CZ", // values adjusted for Czechia, f.e. URLs
          },
        })
        .pipe(
          catchError(
            (error: AxiosError<TicketmasterResponse>) =>
              new Promise<AxiosError<TicketmasterResponse>>((resolve) => resolve(error))
          )
        )
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
      `Limit: ${headers["rate-limit"]}, Available: ${headers["rate-limit-available"]}, Over: ${headers["rate-limit-over"]}, Reset: ${headers["rate-limit-reset"]}`
    );

    if ("fault" in data) {
      // HTTP 401 - invalid API key
      // HTTP 429 - quota reached
      this.#logger.error(data.fault.faultstring);
      return;
    }

    this.#logger.log(data.page);

    if (!data._embedded || data.page.number >= data.page.totalPages) {
      this.#logger.log("No more events.");
      this.#currentPage = 0;
      return;
    }

    this.#currentPage++;

    // extract concert data
    // TODO: event.dates.status.code: 'onsale', 'offsale', 'cancelled', 'postponed', 'rescheduled'
    const concerts = data._embedded.events.map<ConcertEventJob>((event) => ({
      meta: {
        portal: "ticketmaster",
        eventId: event.id,
      },
      event: {
        name: event.name,
        artists: event._embedded.attractions.map((a) => ({
          name: a.name,
          country: undefined,
        })),
        genres: [...new Set(event.classifications.map((c) => [c.genre.name, c.subGenre.name]).flat())].map((g) => ({
          name: g,
        })),
        dateTime: {
          start: event.dates.start.dateTime ?? event.dates.start.localDate, // `dateTime` not present if f.e. `event.dates.status.code === 'postponed'`
          end: undefined,
        },
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
        isOnSale: event.dates.status.code === "onsale",
      },
    }));
    // add data to the queue
    await this.concertEventsQueue.addBulk(
      concerts.map((concert) => ({ name: ConcertEventsQueue.jobs.ticketmaster, data: concert }))
    );
  }
}
