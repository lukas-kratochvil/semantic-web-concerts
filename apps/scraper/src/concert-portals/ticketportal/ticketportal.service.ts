import { TZDateMini } from "@date-fns/tz";
import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  type MusicEventsQueueDataType,
  type MusicEventsQueueNameType,
  MusicEventsQueue,
} from "@semantic-web-concerts/core";
import { ItemAvailability } from "@semantic-web-concerts/core/interfaces";
import type { Queue } from "bullmq";
import { addDays, format, hoursToMilliseconds, set } from "date-fns";
import { launch, type Browser, type Page } from "puppeteer";
import type { ConfigSchema } from "../../config/schema";
import type { ICronJobService } from "../cron-job-service.types";

const CZ_TIMEZONE = "Europe/Prague";

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
    @InjectQueue(MusicEventsQueue.name)
    private readonly musicEventsQueue: Queue<
      MusicEventsQueueDataType,
      MusicEventsQueueDataType,
      MusicEventsQueueNameType
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

  #getEnGenreNames(csGenreNames: string): string[] {
    return [
      ...new Set(
        csGenreNames
          .split("/")
          .map((genre) => genre.trim())
          .filter((genre) => genre !== "")
          .map((genre) => {
            switch (genre) {
              case "Vážná hudba":
                return "classical";
              case "Pro děti":
                return "children's music";
              case "Hard & Heavy":
                return "heavy metal";
              case "Folklor":
                return "traditional folk music";
              case "Ethno":
                return "ethnic electronica";
              case "Párty":
                return "party music";
              case "Alternativa":
                return "alternative music";
              case "RnB":
                return "r&b";
              default:
                return genre.toLowerCase();
            }
          })
      ),
    ];
  }

  async #getVenueData(
    venueUrl: string,
    browser: Browser
  ): Promise<MusicEventsQueueDataType["event"]["venues"][number]> {
    if (!venueUrl) {
      throw new Error("Venue URL is undefined!");
    }

    const venuePage = await browser.newPage();
    let venue: MusicEventsQueueDataType["event"]["venues"][number];

    try {
      if (!(await venuePage.goto(venueUrl))) {
        throw new Error("Cannot navigate to the URL: " + venueUrl);
      }

      const name = await venuePage.$eval(".detail-content > h1", (elem) => elem.innerText.trim());

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
        latitude: undefined,
        longitude: undefined,
        address: {
          country: "CZ",
          locality: city,
          street: address,
        },
      };

      const mapUrl = await addressBlock.$eval("a", (elem) => elem.href);
      const daddr = new URL(mapUrl).searchParams.get("daddr");

      if (daddr) {
        const [latitude, longitude] = daddr.split(",").map((coor) => coor.trim());

        if (latitude && longitude) {
          venue.latitude = latitude;
          venue.longitude = longitude;
        }
      }
    } finally {
      await venuePage.close();
    }

    return venue;
  }

  async #getMusicEvents(
    page: Page,
    musicEventUrl: string,
    genreName: string,
    multipleEventDatesChecker: Set<string>
  ): Promise<MusicEventsQueueDataType[]> {
    const tickets = await page.$$("::-p-xpath(.//section[@id='vstupenky']/div[contains(@id, 'vstupenka-')])");

    if (tickets.length > 1) {
      if (multipleEventDatesChecker.has(musicEventUrl)) {
        return [];
      }

      multipleEventDatesChecker.add(musicEventUrl);
    }

    const musicEventData: Pick<MusicEventsQueueDataType, "event">["event"][] = [];

    for (const ticket of tickets) {
      try {
        const eventName = await ticket.$eval(".ticket-info > .detail > .event", (elem) =>
          elem.firstChild?.textContent?.trim()
        );

        if (!eventName) {
          throw new Error("[" + musicEventUrl + "] - Missing event name.");
        }

        const startDateStr = await ticket.$eval(
          "::-p-xpath(.//div[contains(@class, 'ticket-date')]/div[@class='date']/div[@class='day'])",
          (elem) => elem.getAttribute("content")
        );

        if (!startDateStr) {
          throw new Error("[" + musicEventUrl + "] - Missing event start date.");
        }

        const startDateTime = new TZDateMini(startDateStr, CZ_TIMEZONE);

        let doorsDatetime: Date | undefined;
        try {
          const doorsTimeStr = await ticket.$eval(
            "::-p-xpath(.//div[contains(@class, 'ticket-info')]/div[@class='detail']/div[@itemprop='name']/div[contains(@class, 'popiska')])",
            (elem) => (elem as HTMLDivElement).innerText.match(/\b(?:doors|vstup)\s+(\d{1,2}:\d{2})/i)?.at(1)
          );

          if (doorsTimeStr) {
            const datePart = format(startDateTime, "yyyy-MM-dd");
            const [hours, minutes] = doorsTimeStr.split(":").map(Number);
            const doorsDateTimeStr = `${datePart}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
            doorsDatetime = new TZDateMini(doorsDateTimeStr, CZ_TIMEZONE);
          }
        } catch {
          /* doors time not found */
        }

        const venueBlock = await ticket.$(
          "::-p-xpath(.//div[contains(@class, 'ticket-info')]/div[@class='detail']/div[@itemprop='location'])"
        );

        if (!venueBlock) {
          throw new Error("[" + musicEventUrl + "] - Missing venue info.");
        }

        const venueUrl = await venueBlock.$eval("a.building", (elem) => (elem as HTMLAnchorElement).href.trim());
        let venueData: MusicEventsQueueDataType["event"]["venues"][number];

        try {
          venueData = await this.#getVenueData(venueUrl, page.browser());
        } catch {
          const venueName = await venueBlock.$eval("a.building > span", (elem) => elem.textContent?.trim());
          const venueCity = await venueBlock.$eval("::-p-xpath(./div[@itemprop='address']//span)", (elem) =>
            elem.textContent?.trim()
          );

          if (!venueName || !venueCity) {
            throw new Error("[" + musicEventUrl + "] - Missing venue data.");
          }

          venueData = {
            name: venueName,
            latitude: undefined,
            longitude: undefined,
            address: {
              country: "CZ",
              locality: venueCity,
              street: undefined,
            },
          };
        }

        // TODO: extract artists (their name and country) from the event name or from the event description
        const artistNames: string[] = [];

        if (["Vážná hudba", "Pro děti", "Párty", "Disco"].includes(genreName)) {
          artistNames.push(genreName);
        } else {
          artistNames.push(
            eventName
              .split(/[,:;(-]/)
              .at(0)
              ?.trim() as string
          );
        }

        const artists = artistNames.map((artistName): MusicEventsQueueDataType["event"]["artists"][number] => ({
          name: artistName,
          genres: this.#getEnGenreNames(genreName),
          sameAs: [],
        }));

        const soldOutBox = await ticket.$("div.ticket-info > div.status > div.status-content");

        musicEventData.push({
          name: eventName,
          url: musicEventUrl,
          doorTime: doorsDatetime,
          startDate: startDateTime,
          endDate: undefined,
          artists,
          venues: [{ ...venueData }],
          ticket: {
            url: musicEventUrl,
            availability: soldOutBox === null ? ItemAvailability.InStock : ItemAvailability.SoldOut,
          },
        });
      } catch (e) {
        this.#logger.error("[" + musicEventUrl + "]", e);
      }
    }
    return musicEventData.map((event): MusicEventsQueueDataType => ({ event }));
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

      // GET MUSIC EVENTS
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
            // show all music events in this panel block
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

            // get all music event links from the panel block
            const newUrls = await panelBlock.$$eval("div.koncert > div.thumbnail > a", (elems) =>
              elems.map((elem) => elem.href)
            );

            // extract music event data and add it to the queue
            for (const url of newUrls) {
              const musicEventPage = await browser.newPage();

              try {
                if (!(await musicEventPage.goto(url))) {
                  throw new Error("Cannot navigate to the URL.");
                }

                const musicEvents = await this.#getMusicEvents(
                  musicEventPage,
                  url,
                  genreName,
                  multipleEventDatesChecker
                );
                await this.musicEventsQueue.addBulk(
                  musicEvents.map((event) => ({ name: "ticketportal", data: event }))
                );
              } catch (e) {
                this.#logger.error("[" + url + "]", e);
              } finally {
                await musicEventPage.close();
              }
            }
          }
        } catch (e) {
          this.#logger.error(e instanceof Error ? e.message : e, e);
        } finally {
          multipleEventDatesChecker.clear();
        }
      }
    } catch (e) {
      this.#logger.error(e instanceof Error ? e.message : e, e);
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
