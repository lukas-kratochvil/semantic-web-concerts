import { HttpService } from "@nestjs/axios";
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import {
  type ConcertEventsQueueDataType,
  type ConcertEventsQueueNameType,
  ConcertEventsQueue,
} from "@semantic-web-concerts/core";
import { AxiosError } from "axios";
import type { Queue } from "bullmq";
import { addDays, max, set } from "date-fns";
import { catchError, firstValueFrom } from "rxjs";
import type { ICronJobService } from "../cron-job-service.types";
import { TicketmasterResponse } from "./ticketmaster-api.types";

@Injectable()
export class TicketmasterService implements ICronJobService {
  readonly #logger = new Logger(TicketmasterService.name);
  #currentPage = 0;
  #runDate = new Date(Date.now());
  readonly #scheduledHour = 2;

  readonly jobName = "ticketmaster";
  readonly jobType = "interval";

  constructor(
    @InjectQueue(ConcertEventsQueue.name)
    private readonly concertEventsQueue: Queue<
      ConcertEventsQueueDataType,
      ConcertEventsQueueDataType,
      ConcertEventsQueueNameType
    >,
    private readonly http: HttpService
  ) {}

  getRunDate(): Date {
    return this.#runDate;
  }

  isInProcess() {
    return this.#currentPage !== 0;
  }

  #computeNextRunDate() {
    const now = new Date();
    let runDate = set(now, {
      hours: this.#scheduledHour,
      minutes: 0,
      seconds: 0,
      milliseconds: 0,
    });

    while (runDate.getTime() <= Date.now()) {
      runDate = addDays(runDate, 1);
    }

    return runDate;
  }

  #setNewStartDate(availabilityInMsUTC: number) {
    const nextAvailableDate = new Date(availabilityInMsUTC);
    const nextPeriodDate = this.#computeNextRunDate();
    this.#runDate = max([nextAvailableDate, nextPeriodDate]);
  }

  async run() {
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
      return;
    }

    const { data, headers, status } = res;

    // headers["rate-limit"] - what’s the rate limit available to you, the default is 5000
    // headers["rate-limit-available"] - how many requests are available to you, this will be 5000 minus all the requests you’ve done
    // headers["rate-limit-over"] - how many requests over your quota you’ve made
    // headers["rate-limit-reset"] - the UTC date and time of when your quota will be reset
    this.#logger.log(
      `Limit: ${headers["rate-limit"]}, Available: ${headers["rate-limit-available"]}, Over: ${headers["rate-limit-over"]}, Reset: ${headers["rate-limit-reset"]}`
    );

    if ("fault" in data) {
      // HTTP 401 - invalid API key
      // HTTP 429 - quota reached
      if (status === 429) {
        this.#setNewStartDate(Number(headers["rate-limit-reset"]));
      }

      this.#logger.error(data.fault.faultstring);
      return;
    }

    if (!data._embedded || data.page.number >= data.page.totalPages) {
      this.#logger.log("No more events.");
      this.#currentPage = 0;
      this.#setNewStartDate(Number(headers["rate-limit-reset"]));
      return;
    }

    this.#currentPage++;

    // extract concert data
    const concerts = data._embedded.events.map<ConcertEventsQueueDataType>((event) => ({
      meta: {
        portal: "ticketmaster",
        eventId: event.id,
      },
      event: {
        name: event.name,
        artists: event._embedded.attractions
          .filter(
            (a) =>
              !a.classifications
                .map((c) => c.subType.name)
                .flat()
                .includes("Koncert")
          )
          .map((a) => ({
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
        // TODO: event.dates.status.code: 'onsale', 'offsale', 'cancelled', 'postponed', 'rescheduled'
        isOnSale: event.dates.status.code === "onsale",
      },
    }));
    // add data to the queue
    await this.concertEventsQueue.addBulk(concerts.map((concert) => ({ name: "ticketmaster", data: concert })));
  }
}
