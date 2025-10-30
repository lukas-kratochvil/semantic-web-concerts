import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  type ConcertEventsQueueDataType,
  type ConcertEventsQueueNameType,
  ConcertEventsQueue,
} from "@semantic-web-concerts/core";
import type { Queue } from "bullmq";
import { addDays, hoursToMilliseconds, set } from "date-fns";
import { launch, type Browser, type Page } from "puppeteer";
import type { ConfigSchema } from "../../config/schema";
import type { ICronJobService } from "../cron-job-service.types";

@Injectable()
export class TicketportalService implements ICronJobService {
  readonly #logger = new Logger(TicketportalService.name);
  readonly #baseUrl: string;
  readonly #puppeteerArgs: string[];

  #isInProcess = false;
  #runDate = new Date(Date.now() + hoursToMilliseconds(1));
  readonly #scheduledHour = 3;

  readonly jobName = "ticketportal";
  readonly jobType = "timeout";

  constructor(
    @InjectQueue(ConcertEventsQueue.name)
    private readonly concertEventsQueue: Queue<
      ConcertEventsQueueDataType,
      ConcertEventsQueueDataType,
      ConcertEventsQueueNameType
    >,
    config: ConfigService<ConfigSchema, true>
  ) {
    this.#baseUrl = config.get("ticketportal.url", { infer: true });
    // Running as root without --no-sandbox is not supported. See https://crbug.com/638180.
    this.#puppeteerArgs
      = config.get("nodeEnv", { infer: true }) === "development" ? ["--no-sandbox", "--disable-setuid-sandbox"] : [];
  }

  getRunDate(): Date {
    return this.#runDate;
  }

  isInProcess() {
    return this.#isInProcess;
  }

  async #getVenueData(
    venueUrl: string,
    browser: Browser
  ): Promise<ConcertEventsQueueDataType["event"]["venues"][number]> {
    if (!venueUrl) {
      throw new Error("Venue URL is undefined!");
    }

    const venuePage = await browser.newPage();
    let venue: ConcertEventsQueueDataType["event"]["venues"][number];

    try {
      if (!(await venuePage.goto(venueUrl))) {
        throw new Error("Cannot navigate to the URL: " + venueUrl);
      }

      const name = await venuePage.$eval(".detail-content > h1", (elem) => elem.textContent?.trim());

      if (!name) {
        throw new Error("Missing venue name.");
      }

      const addressBlock = await venuePage.$(
        "::-p-xpath(//div[contains(@class, 'detail-content')]/section[@id='shortInfo']/descendant::td[2])"
      );

      if (!addressBlock) {
        throw new Error("Missing venue address data!");
      }

      const [city, addressToProcess] = (await addressBlock.evaluate((elem) => (elem as HTMLAnchorElement).innerText))
        .split(",")
        .map((e) => e.trim());
      const address = addressToProcess?.split("\n").at(0)?.trim();

      if (!city) {
        throw new Error("Missing venue city.");
      }
      if (!address) {
        throw new Error("Missing venue address.");
      }

      venue = {
        name,
        city,
        address,
        location: undefined,
      };

      const mapUrl = await addressBlock.$eval("a", (elem) => elem.href);
      const daddr = new URL(mapUrl).searchParams.get("daddr");

      if (daddr) {
        const [latitude, longitude] = daddr.split(",").map((coor) => coor.trim());

        if (latitude && longitude) {
          venue.location = {
            latitude,
            longitude,
          };
        }
      }
    } finally {
      await venuePage.close();
    }

    return venue;
  }

  async #getConcertEvents(
    page: Page,
    concertUrl: string,
    genreName: string,
    multipleEventDatesChecker: Set<string>
  ): Promise<ConcertEventsQueueDataType[]> {
    const tickets = await page.$$("::-p-xpath(.//section[@id='vstupenky']/div[contains(@id, 'vstupenka-')])");

    if (tickets.length > 1) {
      if (multipleEventDatesChecker.has(concertUrl)) {
        return [];
      }

      multipleEventDatesChecker.add(concertUrl);
    }

    const concertData: Pick<
      Pick<ConcertEventsQueueDataType, "event">["event"],
      "name" | "artists" | "dateTime" | "isOnSale" | "venues"
    >[] = [];

    for (const ticket of tickets) {
      try {
        const name = await ticket.$eval(".ticket-info > .detail > .event", (elem) =>
          elem.firstChild?.textContent?.trim()
        );

        if (!name) {
          throw new Error("[" + concertUrl + "] - Missing event name.");
        }

        const startDate = await ticket.$eval(
          "::-p-xpath(.//div[contains(@class, 'ticket-date')]/div[@class='date']/div[@class='day'])",
          (elem) => elem.getAttribute("content")
        );

        if (!startDate) {
          throw new Error("[" + concertUrl + "] - Missing event start date.");
        }

        const venueBlock = await ticket.$(
          "::-p-xpath(.//div[contains(@class, 'ticket-info')]/div[@class='detail']/div[@itemprop='location'])"
        );

        if (!venueBlock) {
          throw new Error("[" + concertUrl + "] - Missing venue info.");
        }

        const venueUrl = await venueBlock.$eval("a.building", (elem) => (elem as HTMLAnchorElement).href.trim());
        let venueData: ConcertEventsQueueDataType["event"]["venues"][number];

        try {
          venueData = await this.#getVenueData(venueUrl, page.browser());
        } catch (e) {
          this.#logger.error(e);
          const venueName = await venueBlock.$eval("a.building > span", (elem) => elem.textContent?.trim());
          const venueCity = await venueBlock.$eval("::-p-xpath(./div[@itemprop='address']//span)", (elem) =>
            elem.textContent?.trim()
          );

          if (!venueName || !venueCity) {
            throw new Error("[" + concertUrl + "] - Missing venue data.");
          }

          venueData = {
            name: venueName,
            city: venueCity,
            address: undefined,
            location: undefined,
          };
        }

        // TODO: extract artists (their name and country) from the event name or from the event description
        const artists: { name: string; country: string }[] = [];
        // TODO: extract door time from the description
        const doors = undefined;
        const soldOutBox = await ticket.$("div.ticket-info > div.status > div.status-content");

        concertData.push({
          name,
          artists: artists.map((artist) => ({ name: artist.name, country: artist.country, externalUrls: {} })),
          dateTime: {
            doors,
            start: startDate,
            end: undefined,
          },
          venues: [{ ...venueData }],
          isOnSale: soldOutBox === null,
        });
      } catch (e) {
        this.#logger.error("[" + concertUrl + "]", e);
      }
    }
    return concertData.map((data) => ({
      meta: {
        portal: "ticketportal",
        eventUrl: concertUrl,
      },
      event: {
        name: data.name,
        artists: data.artists,
        genres: [{ name: genreName }],
        dateTime: data.dateTime,
        venues: data.venues,
        isOnSale: data.isOnSale,
        ticketsUrl: concertUrl,
      },
    }));
  }

  async run() {
    const browser = await launch({
      defaultViewport: {
        height: 1000,
        width: 1500,
      },
      args: [
        ...this.#puppeteerArgs,
        // The `--user-agent` arg tricks websites into thinking that headless Chromium is a normal Chrome browser.
        // Headless browsers often have different user-agents that websites can detect, e.g: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36".
        // robots.txt file (https://www.ticketportal.cz/robots.txt) allows to crawl music events
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      ],
    });

    try {
      this.#isInProcess = true;
      const page = (await browser.pages())[0]!;

      // load page and wait for a dynamic content (JS) to be loaded properly before continuing
      if (!(await page.goto(this.#baseUrl, { waitUntil: "networkidle2" }))) {
        throw new Error(`No response from the base url: ${this.#baseUrl}.`);
      }

      // SETUP
      // 1) deny cookies
      await page.locator("button#didomi-notice-learn-more-button").click();
      await page.locator("button#btn-toggle-disagree").click();

      // GET CONCERTS
      const genreNames = (
        await page.$$eval("::-p-xpath(//nav//div[@id='filterMenu']//div[@id='filter_subkategorie']/label)", (elems) =>
          elems.map((elem) => elem.textContent?.trim())
        )
      ).filter((genreName) => genreName !== undefined);

      const multipleEventDatesChecker = new Set<string>();

      for (const genreName of genreNames) {
        await page.goto(this.#baseUrl);

        try {
          await page
            .locator(
              `::-p-xpath(//nav//div[@id='filterMenu']//div[@id='filter_subkategorie']/label[contains(text(), '${genreName}')])`
            )
            .click();
          const panelBlocks = await page.$$(
            "::-p-xpath(//div[contains(@class, 'panel-blok') and not(contains(@class, 'super-nove-top')) and not (contains(@class, 'donekonecna'))])"
          );

          for (const panelBlock of panelBlocks) {
            // show all concerts in this panel block
            while (true) {
              const nextButton = await panelBlock.$("button#btn-load");

              if (!nextButton) {
                break;
              }

              try {
                await nextButton.click();
              } catch (e) {
                this.#logger.error("[" + genreName + "] - Panel next button error:", e);
                break;
              }
            }

            // get all concert links from the panel block
            const newUrls = await panelBlock.$$eval("div.koncert > div.thumbnail > a", (elems) =>
              elems.map((elem) => elem.href)
            );

            // extract concert data and add it to the queue
            for (const url of newUrls) {
              const concertPage = await browser.newPage();

              try {
                if (!(await concertPage.goto(url))) {
                  throw new Error("Cannot navigate to the URL.");
                }

                const concerts = await this.#getConcertEvents(concertPage, url, genreName, multipleEventDatesChecker);
                await this.concertEventsQueue.addBulk(
                  concerts.map((concert) => ({ name: "ticketportal", data: concert }))
                );
              } catch (e) {
                this.#logger.error("[" + url + "]", e);
              } finally {
                await concertPage.close();
              }
            }
          }
        } catch (e) {
          this.#logger.error(e instanceof Error ? e.message : e);
        } finally {
          multipleEventDatesChecker.clear();
        }
      }
    } catch (e) {
      this.#logger.error(e instanceof Error ? e.message : e);
    } finally {
      await browser.close();
      this.#isInProcess = false;
      this.#setNextRunDate();
    }
  }

  #setNextRunDate() {
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

    this.#runDate = runDate;
  }
}
