import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Timeout } from "@nestjs/schedule";
import type { ConcertEvent } from "@semantic-web-concerts/shared/src/model/concert-event";
import { Queue } from "bullmq";
import { parse } from "date-fns";
import { type Browser, launch } from "puppeteer";
import type { ConfigSchema } from "../../config/schema";
import { CONCERT_EVENTS_QUEUE } from "../../utils/queue";

@Injectable()
export class GooutService {
  readonly #logger = new Logger(GooutService.name);
  readonly #baseUrl: string;

  constructor(
    @InjectQueue(CONCERT_EVENTS_QUEUE) private readonly concertEventsQueue: Queue<ConcertEvent>,
    config: ConfigService<ConfigSchema, true>
  ) {
    this.#baseUrl = config.get("goout.url", { infer: true });
  }

  async #getConcertEvent(browser: Browser, concertUrl: string): Promise<ConcertEvent> {
    const page = await browser.newPage();
    const res = await page.goto(concertUrl);

    if (!res) {
      this.#logger.error(`No response from the concert url: ${concertUrl}.`);
      throw new Error(`No response from the concert url: ${concertUrl}.`);
    }

    const name = await page.$eval("h1", (elem) => elem.innerText);

    const artistsDivs = await page.$$(
      "::-p-xpath(//h2[text()='Performing artists']/following-sibling::div/div[contains(@class, 'profile-box')]/div/div[contains(@class, 'content')]/div[1])"
    );
    const artists = (
      await Promise.all(
        artistsDivs.map(async (artistDiv) => ({
          name: await artistDiv.$eval("::-p-xpath(./*[1])", (elem) => elem.textContent?.trim()),
          country: await artistDiv.$eval("::-p-xpath(./*[2])", (elem) => elem.textContent?.trim()),
        }))
      )
    ).filter((artist): artist is { name: string; country: string | undefined } => artist.name !== undefined);

    const [datetime1, datetime2] = await page.$$eval(
      "div.detail-header time",
      // `dateTime` attribute of the HTML `time` element contains start datetime value even for the 'end datetime' element, so we have to extract the datetime from the text content
      (elems) => elems.map((elem, i) => (i === 0 ? elem.dateTime : elem.innerText))
    );

    if (!datetime1) {
      this.#logger.error(`Missing start date on the concert url: ${concertUrl}.`);
      throw new Error(`Missing start date on the concert url: ${concertUrl}.`);
    }

    const getEndDatetime = (value: string) => {
      // `parse` returns an Invalid Date if the date-string cannot be parsed (Invalid Date is a Date, whose time value is NaN.)
      const date = parse(value, "dd/MM/yyyy", new Date().setHours(0, 0, 0, 0));
      return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
    };
    const startDatetime = datetime1;
    const endDatetime = datetime2 ? getEndDatetime(datetime2) : undefined;

    const genresNames = (
      await page.$$eval("div.py-2 > div.container > div.row a > span", (elems) => elems.map((elem) => elem.innerText))
    ).filter((genreName) => genreName !== null);

    const getVenueSelector = (valueName: string) =>
      `::-p-xpath(//section[contains(@class, 'py-1')]//div[contains(@class, 'info-item')]/div/span[text()='${valueName}']/parent::div/parent::div/div[2])` as const;
    const venueName = await page.$eval(getVenueSelector("Venue"), (elem) => (elem as HTMLAnchorElement).innerText);
    const venueAddress = await page.$eval(getVenueSelector("Address"), (elem) => (elem as HTMLAnchorElement).innerText);

    const [isOnSale, ticketsUrl] = await page.$eval(
      ".ticket-button",
      (elem) => [elem.textContent?.trim() === "Tickets", (elem as HTMLAnchorElement).href] as const
    );

    await page.close();
    return {
      meta: {
        portal: "goout",
        eventId: concertUrl,
      },
      event: {
        name,
        artists,
        dateTime: {
          start: startDatetime,
          end: endDatetime,
        },
        genres: genresNames.map((genreName) => ({ name: genreName })),
        venues: [
          {
            name: venueName,
            address: venueAddress,
            location: undefined,
          },
        ],
        isOnSale,
        ticketsUrl,
      },
    };
  }

  @Timeout(3_000)
  async fetch() {
    const browser = await launch({
      defaultViewport: {
        height: 1000,
        width: 1500,
      },
    });
    // load the page already customized for Czechia
    await browser.setCookie({
      name: "countryIso",
      value: "cz",
      domain: ".goout.net",
      path: "/",
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
    await page.locator("button#CybotCookiebotDialogBodyButtonDecline").click();

    // 2) check that first dropdown menu button has `innerText="Czechia"` otherwise select "Czechia"
    const country = "Czechia";
    const countryButton = await page.$(
      `::-p-xpath(//button[contains(@class, 'filter-trigger') and contains(text(), '${country}')])`
    );

    if (!countryButton) {
      await page.locator("button.filter-trigger").click();
      await page
        .locator(`::-p-xpath(//div[contains(@class, 'country-list')]//a[contains(text(), '${country}')])`)
        .click();
    }

    // 3) set the 'Concerts' category
    await page
      .locator("::-p-xpath(//button[contains(@class, 'filter-trigger') and contains(text(), 'All categories')])")
      .click();
    await page
      .locator(
        "::-p-xpath(//span[contains(@class, 'categoryFilterItem')]/a/span[contains(@class, 'd-block') and contains(text(), 'Concerts')])"
      )
      .click();

    // GET CONCERTS
    while (true) {
      try {
        // scroll to the "Show more" button
        const showMoreButton = page.locator(
          "::-p-xpath(//div[contains(@class, 'd-block')]/button[contains(text(), 'Show more')])"
        );
        await showMoreButton.scroll();

        // get concert links
        const linksSelector = "div.event > div.info > a.title";
        await page.waitForSelector(linksSelector);
        const newUrls = await page.$$eval(linksSelector, (links) => links.map((link) => link.href));

        // extract concert data and add it to the queue
        newUrls.forEach(async (url) => {
          const concert = await this.#getConcertEvent(browser, url);
          await this.concertEventsQueue.add("goout", concert);
        });

        // load new concerts
        await showMoreButton.click({ delay: 2_000 });
      } catch (e) {
        this.#logger.error(e);
        break;
      }
    }

    await browser.close();
  }
}
