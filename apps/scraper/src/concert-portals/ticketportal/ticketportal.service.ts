import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Timeout } from "@nestjs/schedule";
import { type ConcertEventJob, ConcertEventsQueue } from "@semantic-web-concerts/shared";
import type { Queue } from "bullmq";
import { type Browser, launch } from "puppeteer";
import type { ConfigSchema } from "../../config/schema";

@Injectable()
export class TicketportalService {
  readonly #logger = new Logger(TicketportalService.name);
  readonly #baseUrl: string;

  constructor(
    @InjectQueue(ConcertEventsQueue.name) private readonly concertEventsQueue: Queue<ConcertEventJob>,
    config: ConfigService<ConfigSchema, true>
  ) {
    this.#baseUrl = config.get("ticketportal.url", { infer: true });
  }

  async #getConcertEvents(
    browser: Browser,
    concertUrl: string,
    genreName: string,
    multipleEventDatesChecker: Set<string>
  ): Promise<ConcertEventJob[]> {
    const page = await browser.newPage();
    const res = await page.goto(concertUrl);

    if (!res) {
      this.#logger.error(`No response from the concert url: ${concertUrl}.`);
      throw new Error(`No response from the concert url: ${concertUrl}.`);
    }

    const tickets = await page.$$("::-p-xpath(.//section[@id='vstupenky']/div[contains(@id, 'vstupenka-')])");

    if (tickets.length > 1) {
      if (multipleEventDatesChecker.has(concertUrl)) {
        return [];
      }

      multipleEventDatesChecker.add(concertUrl);
    }

    const concertData: Pick<Pick<ConcertEventJob, "event">["event"], "name" | "dateTime" | "isOnSale" | "venues">[]
      = [];

    for (const ticket of tickets) {
      try {
        const name = await ticket.$eval("div.ticket-info > div.detail > div.event", (elem) =>
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
          this.#logger.error(`Missing venue info on the concert url: ${concertUrl}.`);
          break;
        }

        const venueName = await venueBlock.$eval("a.building > span", (elem) => elem.textContent?.trim());
        const venueAddress = await venueBlock.$eval("::-p-xpath(./div[@itemprop='address']//span)", (elem) =>
          elem.textContent?.trim()
        );
        const soldOutBox = await ticket.$("div.ticket-info > div.status > div.status-content");

        if (!name || !startDate || !venueName || !venueAddress) {
          this.#logger.error(`Missing event data on the concert url: ${concertUrl}.`);
          break;
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
        this.#logger.error(`Error occurred for the url: ${concertUrl}`);
        this.#logger.error(e);
      }
    }
    await page.close();
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
        // headless browsers often have different user agents that websites can detect
        "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      ],
    });
    const page = (await browser.pages())[0]!;

    // load page and wait for a dynamic content (JS) to be loaded properly before continuing
    const res = await page.goto(this.#baseUrl, { waitUntil: "networkidle2" });

    if (!res) {
      this.#logger.error(`No response from the base url: ${this.#baseUrl}.`);
      return;
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

    for (const genreName of genreNames) {
      const genrePage = await browser.newPage();
      await genrePage.goto(this.#baseUrl, { waitUntil: "networkidle2" });
      await genrePage
        .locator(
          `::-p-xpath(//nav//div[@id='filterMenu']//div[@id='filter_subkategorie']/label[contains(text(), '${genreName}')])`
        )
        .click();
      const panelBlocks = await genrePage.$$(
        "::-p-xpath(//div[contains(@class, 'panel-blok') and not(contains(@class, 'super-nove-top'))])"
      );
      const multipleEventDatesChecker = new Set<string>();

      for (const panelBlock of panelBlocks) {
        if (!panelBlock) {
          break;
        }

        // show all concerts in this panel block
        while (true) {
          const nextButton = await panelBlock.$("button#btn-load");

          if (nextButton) {
            await nextButton.click();
          } else {
            break;
          }
        }

        // get all concert links from the panel block
        const newUrls = await panelBlock.$$eval("div.koncert > div.thumbnail > a", (elems) =>
          elems.map((elem) => elem.href)
        );

        // extract concert data and add it to the queue
        for (const url of newUrls) {
          const concerts = await this.#getConcertEvents(browser, url, genreName, multipleEventDatesChecker);
          await this.concertEventsQueue.addBulk(
            concerts.map((concert) => ({ name: ConcertEventsQueue.jobs.ticketportal, data: concert }))
          );
        }
      }

      await genrePage.close();
    }
  }
}
