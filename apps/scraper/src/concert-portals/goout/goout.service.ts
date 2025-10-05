import { InjectQueue } from "@nestjs/bullmq";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  type ConcertEventsQueueDataType,
  type ConcertEventsQueueNameType,
  ConcertEventsQueue,
} from "@semantic-web-concerts/core";
import { Queue } from "bullmq";
import { addMinutes, hoursToMinutes, parse } from "date-fns";
import { launch, type Page } from "puppeteer";
import type { ConfigSchema } from "../../config/schema";
import type { ICronJobService } from "../cron-job-service.types";

@Injectable()
export class GooutService implements ICronJobService {
  readonly #logger = new Logger(GooutService.name);
  readonly #baseUrl: string;
  readonly #puppeteerArgs: string[];

  #isInProcess = false;
  #runDate = new Date(Date.now());

  readonly jobName = "goout";
  readonly jobType = "timeout";
  readonly runPeriodInMinutes = hoursToMinutes(24);

  constructor(
    @InjectQueue(ConcertEventsQueue.name)
    private readonly concertEventsQueue: Queue<
      ConcertEventsQueueDataType,
      ConcertEventsQueueDataType,
      ConcertEventsQueueNameType
    >,
    config: ConfigService<ConfigSchema, true>
  ) {
    this.#baseUrl = config.get("goout.url", { infer: true });
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

  async #getConcertEvent(page: Page, concertUrl: string): Promise<ConcertEventsQueueDataType> {
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
      throw new Error("Missing start date.");
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

  async run() {
    this.#isInProcess = true;
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
      // load the page already customized for Czechia
      await browser.setCookie({
        name: "countryIso",
        value: "cz",
        domain: ".goout.net",
        path: "/",
      });

      const page = (await browser.pages())[0]!;

      // load page and wait for a dynamic content (JS) to be loaded properly before continuing
      if (!(await page.goto(this.#baseUrl, { waitUntil: "networkidle2" }))) {
        throw new Error(`No response from the base url: ${this.#baseUrl}.`);
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
            const concertPage = await browser.newPage();

            try {
              if (!(await concertPage.goto(url))) {
                throw new Error("Cannot navigate to the URL.");
              }

              const concert = await this.#getConcertEvent(concertPage, url);
              await this.concertEventsQueue.add("goout", concert);
            } catch (e) {
              this.#logger.error("[" + url + "] - " + (e instanceof Error ? e.message : String(e)));
            } finally {
              await concertPage.close();
            }
          });

          // load new concerts
          await showMoreButton.click({ delay: 2_000 });
        } catch (e) {
          this.#logger.error(e instanceof Error ? e.message : e);
          break;
        }
      }
    } catch (e) {
      this.#logger.error(e instanceof Error ? e.message : e);
    } finally {
      await browser.close();
      this.#isInProcess = false;
      // TODO: correct setting next `runDate` so it is always in the future and in the night
      this.#runDate = addMinutes(this.getRunDate(), this.runPeriodInMinutes);
    }
  }
}
