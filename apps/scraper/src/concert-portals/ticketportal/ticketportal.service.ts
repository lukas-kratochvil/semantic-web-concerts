import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Timeout } from "@nestjs/schedule";
import puppeteer, { type Browser } from "puppeteer";
import type { ConfigSchema } from "src/config/schema";
import type { ConcertEvent } from "../types";

@Injectable()
export class TicketportalService {
  readonly #logger = new Logger(TicketportalService.name);
  readonly #baseUrl: string;

  constructor(config: ConfigService<ConfigSchema, true>) {
    this.#baseUrl = config.get("ticketportal.url", { infer: true });
  }

  async #getConcertEvents(
    browser: Browser,
    concertUrl: string,
    genreName: string,
  ): Promise<ConcertEvent[]> {
    const page = await browser.newPage();
    const res = await page.goto(concertUrl);

    if (!res) {
      this.#logger.error(`No response from the concert url: ${concertUrl}.`);
      throw new Error(`No response from the concert url: ${concertUrl}.`);
    }

    const tickets = await page.$$(
      "::-p-xpath(//section[@id='vstupenky']/div[contains(@id, 'vstupenka')])",
    );

    return (
      await Promise.allSettled(
        tickets.map(async (ticket) => {
          const name = await ticket.$eval(
            "div.ticket-info > div.detail > div.event",
            (elem) => elem.firstChild?.textContent?.trim(),
          );
          const startDate = await ticket.$eval(
            "::-p-xpath(//div[@class='ticket-date']/div[@class='date']/div[@class='day'])",
            (elem) => elem.getAttribute("content"),
          );

          const venueBlock = await ticket.$(
            "::-p-xpath(//div[@class='ticket-info']/div[@class='detail']/div[@itemprop='location'])",
          );

          if (!venueBlock) {
            this.#logger.error(
              `Missing venue info on the concert url: ${concertUrl}.`,
            );
            return null;
          }

          const venueName = await venueBlock.$eval(
            "a.building > span)",
            (elem) => elem.textContent?.trim(),
          );
          const venueAddress = await ticket.$eval(
            "::-p-xpath(./div[@itemprop='address']//span)",
            (elem) => elem.textContent?.trim(),
          );
          const soldOutBox = await ticket.$(
            "div.ticket-info > div.status > div.status-content",
          );

          if (!name || !startDate || !venueName || !venueAddress) {
            this.#logger.error(
              `Missing event data on the concert url: ${concertUrl}.`,
            );
            return null;
          }

          return {
            name,
            startDate,
            venue: {
              name: venueName,
              address: venueAddress,
            },
            isOnSale: soldOutBox === null,
          };
        }),
      )
    )
      .filter((res) => res.status === "fulfilled")
      .map((res) => res.value)
      .filter((value) => value !== null)
      .map((eventData) => ({
        meta: {
          portal: "ticketportal",
          eventId: concertUrl,
        },
        event: {
          name: eventData.name,
          artists: [{ name: eventData.name, country: undefined }],
          genres: [{ name: genreName }],
          dateTime: {
            start: eventData.startDate,
            end: undefined,
          },
          venues: [
            {
              ...eventData.venue,
              location: undefined,
            },
          ],
          isOnSale: eventData.isOnSale,
          ticketsUrl: concertUrl,
        },
      }));
  }

  @Timeout(3_000)
  async fetch() {
    const browser = await puppeteer.launch({
      defaultViewport: {
        height: 1000,
        width: 1500,
      },
      headless: false,
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
      await page.$$eval(
        "::-p-xpath(//nav//div[@id='filterMenu']//div[@id='filter_subkategorie']/label)",
        (elems) => elems.map((elem) => elem.textContent?.trim()),
      )
    ).filter((genreName) => genreName !== undefined);

    genreNames.forEach(async (genreName, i) => {
      if (i !== 0) {
        // TODO: delete
        return;
      }

      const genrePage = await browser.newPage();
      await genrePage.goto(this.#baseUrl, { waitUntil: "networkidle2" });
      await genrePage
        .locator(
          `::-p-xpath(//nav//div[@id='filterMenu']//div[@id='filter_subkategorie']/label[contains(text(), '${genreName}')])`,
        )
        .click();

      const panelBlocks = await genrePage.$$(
        "::-p-xpath(//div[contains(@class, 'panel-blok') and not(contains(@class, 'super-nove-top'))])",
      );

      for (i = 1; i <= panelBlocks.length; i++) {
        const panelBlock = await genrePage.$(
          `::-p-xpath(//div[contains(@class, 'panel-blok') and not(contains(@class, 'super-nove-top'))][${i}])`,
        );

        if (!panelBlock) {
          break;
        }

        const nextButton = await panelBlock.$("button#btn-load");

        if (nextButton) {
          await nextButton.click();
        }

        const newUrls = await panelBlock.$$eval(
          "div.koncert > div.thumbnail > a",
          (elems) => elems.map((elem) => elem.href),
        );

        // get concerts
        newUrls.forEach(async (url) => {
          const concerts = await this.#getConcertEvents(
            browser,
            url,
            genreName,
          );
          // TODO: add data to the job-queue for further processing
          this.#logger.log(concerts);
        });
      }

      await genrePage.close();
    });
  }
}
