import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Timeout } from "@nestjs/schedule";
import {
  type ConcertEventsQueueDataType,
  type ConcertEventsQueueNameType,
  ConcertEventsQueue,
} from "@semantic-web-concerts/core";
import type { Queue } from "bullmq";
import { launch, type Page } from "puppeteer";
import type { ConfigSchema } from "../../config/schema";

@Injectable()
export class TicketportalService {
  readonly #logger = new Logger(TicketportalService.name);
  readonly #baseUrl: string;
  readonly #puppeteerArgs: string[];

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
      "name" | "dateTime" | "isOnSale" | "venues"
    >[] = [];

    for (const ticket of tickets) {
      try {
        const name = await ticket.$eval(".ticket-info > .detail > .event", (elem) =>
          elem.firstChild?.textContent?.trim()
        );
        const startDate = await ticket.$eval(
          "::-p-xpath(.//div[contains(@class, 'ticket-date')]/div[@class='date']/div[@class='day'])",
          (elem) => elem.getAttribute("content")
        );
        const venueBlock = await ticket.$(
          "::-p-xpath(.//div[contains(@class, 'ticket-info')]/div[@class='detail']/div[@itemprop='location'])"
        );

        if (!venueBlock) {
          throw new Error("[" + concertUrl + "] - Missing venue info.");
        }

        const venueName = await venueBlock.$eval("a.building > span", (elem) => elem.textContent?.trim());
        const venueAddress = await venueBlock.$eval("::-p-xpath(./div[@itemprop='address']//span)", (elem) =>
          elem.textContent?.trim()
        );
        const soldOutBox = await ticket.$("div.ticket-info > div.status > div.status-content");

        if (!name || !startDate || !venueName || !venueAddress) {
          throw new Error("[" + concertUrl + "] - Missing event data.");
        }

        concertData.push({
          name,
          dateTime: {
            start: startDate,
            end: undefined,
          },
          venues: [
            {
              name: venueName,
              address: venueAddress,
              location: undefined,
            },
          ],
          isOnSale: soldOutBox === null,
        });
      } catch (e) {
        this.#logger.error("[" + concertUrl + "] - " + (e instanceof Error ? e.message : String(e)));
      }
    }
    return concertData.map((data) => ({
      meta: {
        portal: "ticketportal",
        eventId: concertUrl,
      },
      event: {
        name: data.name,
        artists: [{ name: data.name, country: undefined }], // name of the artist can be retrieved only from the event name
        genres: [{ name: genreName }],
        dateTime: data.dateTime,
        venues: data.venues,
        isOnSale: data.isOnSale,
        ticketsUrl: concertUrl,
      },
    }));
  }

  // TODO: correct Cron period time
  @Timeout(3_000)
  async fetch() {
    const browser = await launch({
      defaultViewport: {
        height: 1000,
        width: 1500,
      },
      args: [
        ...this.#puppeteerArgs,
        // The `--user-agent` arg tricks websites into thinking that headless Chromium is a normal Chrome browser.
        // Headless browsers often have different user-agents that websites can detect,
        // e.g: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/120.0.0.0 Safari/537.36".
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      ],
    });

    try {
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
                this.#logger.error(
                  "[" + genreName + "] - Panel next button error: " + (e instanceof Error ? e.message : e)
                );
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
                this.#logger.error("[" + url + "] - " + (e instanceof Error ? e.message : String(e)));
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
    }
  }
}
